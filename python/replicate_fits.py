"""Independent replication of the MATLAB growth-model fits (Poisson deviance, scipy).
Run:  python3 replicate_fits.py
Prints parameter estimates, deviance and 3/5/7/10-year point forecasts for comparison
with ../results/models_count.csv and forecast_count.csv produced by drone_env_forecast.m.
"""
import numpy as np, pandas as pd
from scipy.optimize import minimize
from scipy.stats import kendalltau, norm

d = pd.read_csv('../data/openalex_drone_env_annual.csv')
d = d[(d.year >= 2005) & (d.year <= 2025)]
t = d.year.values.astype(float); y = d.core_drone_env.values.astype(float); N = d.env_only.values.astype(float)
t0 = 2005.0; tau = t - t0
tf = np.array([2028, 2030, 2032, 2035.]); tauf = tf - t0

def bassF(x, p, q):
    F = (1 - np.exp(-(p+q)*x)) / (1 + (q/p)*np.exp(-(p+q)*x)); return np.where(x <= 0, 0, F)

def mu(name, th, tau):
    if name == 'exponential': return np.exp(th[0]) * np.exp(th[1]*tau)
    if name == 'logistic':    return np.exp(th[0]) / (1 + np.exp(-np.exp(th[1])*(tau-th[2])))
    if name == 'gompertz':    return np.exp(th[0]) * np.exp(-np.exp(-np.exp(th[1])*(tau-th[2])))
    if name == 'bass':
        m, p, q = np.exp(th); x = tau + 1
        return m * (bassF(x, p, q) - bassF(x-1, p, q))

def dev(th, name, yy, NN):
    m = np.maximum(NN * mu(name, th, tau), 1e-12)
    term = np.where(yy > 0, yy*np.log(np.where(yy > 0, yy, 1)/m), 0)
    return 2*np.sum(term - (yy - m))

def fit(name, yy, NN):
    ymax = (yy/NN).max(); cum = (yy/NN).sum()
    b = np.polyfit(tau, np.log((yy+0.5)/NN), 1)
    starts = {'exponential': [[b[1], b[0]]],
              'logistic': [[np.log(k*ymax), np.log(b[0]), (np.log(k*ymax/2)-b[1])/b[0]] for k in (1.5, 3, 10, 30, 100)],
              'gompertz': [[np.log(k*ymax), np.log(b[0]), (np.log(k*ymax/2)-b[1])/b[0]] for k in (1.5, 3, 10, 30, 100)],
              'bass': [[np.log(mm*cum), np.log(p), np.log(q)] for mm in (2, 5, 20, 100, 500) for p in (1e-4, 1e-3, 1e-2) for q in (0.15, 0.3, 0.5)]}[name]
    best = None
    for s in starts:
        r = minimize(dev, s, args=(name, yy, NN), method='Nelder-Mead', options=dict(maxiter=40000, maxfev=40000, xatol=1e-8, fatol=1e-10))
        r = minimize(dev, r.x, args=(name, yy, NN), method='Nelder-Mead', options=dict(maxiter=40000, maxfev=40000, xatol=1e-8, fatol=1e-10))
        if best is None or r.fun < best.fun: best = r
    return best

print('--- counts ---')
for name in ['exponential', 'logistic', 'gompertz', 'bass']:
    r = fit(name, y, np.ones_like(y))
    fc = mu(name, r.x, tauf)
    print(f'{name:12s} dev={r.fun:8.1f}  theta={np.round(r.x,4)}  forecast={np.round(fc).astype(int)}')
print('--- share (offset env_only) ---')
for name in ['exponential', 'logistic', 'gompertz']:
    r = fit(name, y, N)
    fc = 1000*mu(name, r.x, tauf)
    print(f'{name:12s} dev={r.fun:8.1f}  theta={np.round(r.x,4)}  forecast per 1000={np.round(fc,2)}')

# Mann-Kendall / Sen (scipy check)
tau_k, p = kendalltau(t, y)
S = sum(np.sign(y[j]-y[i]) for i in range(len(y)) for j in range(i+1, len(y)))
slopes = [(y[j]-y[i])/(t[j]-t[i]) for i in range(len(y)) for j in range(i+1, len(y))]
print(f'MK counts: S={S}, tau={tau_k:.3f}, p={p:.2e}, Sen={np.median(slopes):.1f}')
share = y/N*1000
S = sum(np.sign(share[j]-share[i]) for i in range(len(y)) for j in range(i+1, len(y)))
slopes = [(share[j]-share[i])/(t[j]-t[i]) for i in range(len(y)) for j in range(i+1, len(y))]
print(f'MK share:  S={S}, Sen={np.median(slopes):.3f}')
print('CAGR 2005-2025 = %.1f%%, last 10 = %.1f%%' % (100*((y[-1]/y[0])**(1/20)-1), 100*((y[-1]/y[-11])**(0.1)-1)))
