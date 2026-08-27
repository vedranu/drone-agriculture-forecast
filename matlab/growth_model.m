function mu = growth_model(name, theta, t, t0)
%GROWTH_MODEL  Expected annual value mu(t) for a named growth model.
%   mu = GROWTH_MODEL(name, theta, t, t0)
%   name  : 'exponential' | 'logistic' | 'gompertz' | 'bass'
%   theta : parameter vector on the UNCONSTRAINED scale (see below)
%   t     : vector of calendar years
%   t0    : reference year (first fitted year); tau = t - t0
%
%   Parameterisations (all positive quantities are log-transformed so that
%   fminsearch can search an unconstrained space):
%   exponential : mu = a * exp(b * tau)                 theta = [log a, b]
%   logistic    : mu = K / (1 + exp(-r (tau - tm)))     theta = [log K, log r, tm]
%   gompertz    : mu = K * exp(-exp(-r (tau - tm)))     theta = [log K, log r, tm]
%   bass        : annual "adoptions" n(tau) = m [F(tau) - F(tau-1)],
%                 F(x) = (1 - exp(-(p+q) x)) / (1 + (q/p) exp(-(p+q) x)),
%                 F(x <= 0) = 0                          theta = [log m, log p, log q]
%
%   'exponential' has no saturation; the three others saturate at K (or m in
%   cumulative terms for Bass).  Returns mu as a column vector.

t = t(:);
tau = t - t0;
switch lower(name)
    case 'exponential'
        a = exp(theta(1)); b = theta(2);
        mu = a * exp(b * tau);
    case 'logistic'
        K = exp(theta(1)); r = exp(theta(2)); tm = theta(3);
        mu = K ./ (1 + exp(-r * (tau - tm)));
    case 'gompertz'
        K = exp(theta(1)); r = exp(theta(2)); tm = theta(3);
        mu = K .* exp(-exp(-r * (tau - tm)));
    case 'bass'
        m = exp(theta(1)); p = exp(theta(2)); q = exp(theta(3));
        % shift so that the first fitted year is tau = 1 (F(0) = 0)
        x  = tau + 1;
        mu = m * (bassF(x, p, q) - bassF(x - 1, p, q));
    otherwise
        error('growth_model:name', 'Unknown model "%s"', name);
end
mu = max(mu, 1e-12);   % keep strictly positive for the Poisson deviance
end

function F = bassF(x, p, q)
F = (1 - exp(-(p + q) .* x)) ./ (1 + (q / p) .* exp(-(p + q) .* x));
F(x <= 0) = 0;
end
