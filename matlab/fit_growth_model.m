function F = fit_growth_model(name, t, y, N, t0, theta0)
%FIT_GROWTH_MODEL  Fit a growth model to annual counts by Poisson deviance.
%   F = FIT_GROWTH_MODEL(name, t, y, N, t0)
%   name : model name (see GROWTH_MODEL)
%   t    : years (vector)
%   y    : observed counts (vector, non-negative)
%   N    : exposure/offset (vector, same size as y) or [] for none.
%          With N, the model describes the RATE g(t) and mu = N .* g(t).
%   t0   : reference year passed to GROWTH_MODEL
%   theta0 (optional): warm start on the unconstrained scale; when given,
%          only this start (plus two small perturbations) is used, which
%          makes bootstrap refits ~10x faster.
%
%   The objective is the Poisson deviance
%       D = 2 * sum( y .* log(y ./ mu) - (y - mu) )      (0*log 0 := 0)
%   which is the natural least-squares analogue for counts, gives equal
%   footing to small early and large late years, and yields a proper
%   log-likelihood for information criteria.  Minimised with fminsearch
%   (Nelder-Mead, base MATLAB/Octave) from several starting points.
%
%   Output struct F: .name .theta .mu (fitted, same length as y) .deviance
%   .loglik .k (n. parameters) .n .aic .aicc .chat (Pearson dispersion)
%   .rmse_log (RMSE of log(y+1) - log(mu+1)) .converged

t = t(:); y = y(:);
if isempty(N), N = ones(size(y)); else, N = N(:); end
n = numel(y);

if nargin >= 6 && ~isempty(theta0)
    theta0 = theta0(:)';
    starts = theta0;                       % single warm start
else
    starts = starting_values(name, t, y, N, t0);
end
obj = @(th) poisson_deviance(y, N .* growth_model(name, th, t, t0));

if size(starts, 1) == 1
    opts = optimset('Display', 'off', 'MaxFunEvals', 6e3, 'MaxIter', 6e3, 'TolFun', 1e-8, 'TolX', 1e-6);
else
    opts = optimset('Display', 'off', 'MaxFunEvals', 2e4, 'MaxIter', 2e4, 'TolFun', 1e-10, 'TolX', 1e-8);
end
best_th = []; best_D = Inf; best_flag = 0;
for s = 1:size(starts, 1)
    th0 = starts(s, :);
    if ~all(isfinite(th0)), continue; end
    try
        [th, Dv, flag] = fminsearch(obj, th0, opts);
        if isfinite(Dv) && Dv < best_D
            best_D = Dv; best_th = th; best_flag = flag;
        end
    catch
        % ignore a failed start
    end
end
% polish from the best point (Nelder-Mead benefits from a restart)
if ~isempty(best_th)
    [th, Dv, flag] = fminsearch(obj, best_th, opts);
    if Dv <= best_D, best_D = Dv; best_th = th; best_flag = flag; end
end

k  = numel(best_th);
mu = N .* growth_model(name, best_th, t, t0);
% Poisson log-likelihood (with the constant term, so AIC is comparable
% across models fitted to the same data)
ll = sum(y .* log(mu) - mu - gammaln(y + 1));

F = struct();
F.name = name; F.theta = best_th; F.mu = mu; F.deviance = best_D;
F.loglik = ll; F.k = k; F.n = n;
F.aic  = -2 * ll + 2 * k;
F.aicc = F.aic + 2 * k * (k + 1) / max(n - k - 1, 1);
F.chat = sum((y - mu).^2 ./ mu) / max(n - k, 1);   % Pearson chi2 / df
F.rmse_log = sqrt(mean((log(y + 1) - log(mu + 1)).^2));
F.converged = (best_flag == 1);
end

% -------------------------------------------------------------------------
function D = poisson_deviance(y, mu)
mu = max(mu, 1e-12);
term = zeros(size(y));
pos = y > 0;
term(pos) = y(pos) .* log(y(pos) ./ mu(pos));
D = 2 * sum(term - (y - mu));
if ~isfinite(D), D = 1e30; end
end

% -------------------------------------------------------------------------
function S = starting_values(name, t, y, N, t0)
% crude but robust starting points on the unconstrained scale
tau = t - t0;
rate = (y + 0.5) ./ N;
% log-linear OLS for slope/intercept
X = [ones(size(tau)) tau];
beta = X \ log(rate);
a0 = beta(1); b0 = max(beta(2), 0.02);
ymax = max(rate);
switch lower(name)
    case 'exponential'
        S = [a0 b0; a0 0.5*b0; a0 1.5*b0];
    case {'logistic', 'gompertz'}
        S = [];
        for Kmult = [1.5 3 10 30 100]
            K = Kmult * ymax;
            % year at which the exponential would reach K/2
            tm = (log(K / 2) - a0) / b0;
            S = [S; log(K) log(b0) tm; log(K) log(0.5*b0) tm; log(K) log(2*b0) tm]; %#ok<AGROW>
        end
    case 'bass'
        cum = sum(rate);
        S = [];
        for mmult = [2 5 20 100 500]
            for p0 = [1e-4 1e-3 1e-2]
                for q0 = [0.15 0.3 0.5]
                    S = [S; log(mmult*cum) log(p0) log(q0)]; %#ok<AGROW>
                end
            end
        end
    otherwise
        error('fit_growth_model:name', 'Unknown model "%s"', name);
end
end
