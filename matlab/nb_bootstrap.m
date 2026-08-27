function B = nb_bootstrap(models, t, y, N, t0, tf, Nf, nboot, chat)
%NB_BOOTSTRAP  Parametric negative-binomial bootstrap of growth-model forecasts.
%   B = NB_BOOTSTRAP(models, t, y, N, t0, tf, Nf, nboot, chat)
%   models : cell array of fitted structs from FIT_GROWTH_MODEL
%   t, y, N: fitted years, counts, exposure (N = [] for none)
%   t0     : reference year
%   tf     : forecast years (vector); Nf = exposure at tf (or [])
%   nboot  : number of replicates (e.g. 1000)
%   chat   : overdispersion used to compute QAICc weights (Pearson chi2/df)
%
%   Each replicate draws y* ~ NegBin(mu_hat, theta_nb) around the fitted
%   values of the model that is being bootstrapped (gamma-Poisson mixture,
%   base MATLAB randg + POISSON_RND), refits the model and records the
%   forecast at tf.  A model-averaged forecast is also recorded, using
%   QAICc weights recomputed on every replicate.
%
%   Output: B.pred{m}  (nboot x numel(tf)) forecasts of model m
%           B.avg      (nboot x numel(tf)) model-averaged forecasts
%           B.theta_nb estimated NB size parameter of each model (vector)
%           B.q05/.q50/.q95 per model and .avg_q05/.avg_q50/.avg_q95

t = t(:); y = y(:); tf = tf(:);
if isempty(N),  N  = ones(size(y));  else, N  = N(:);  end
if isempty(Nf), Nf = ones(size(tf)); else, Nf = Nf(:); end
M = numel(models);
H = numel(tf);

theta_nb = zeros(1, M);
for m = 1:M
    mu = models{m}.mu;
    alpha = sum((y - mu).^2 - mu) / sum(mu.^2);   % 1/size  (method of moments)
    alpha = max(alpha, 1e-6);
    theta_nb(m) = 1 / alpha;
end

pred = cell(1, M);
for m = 1:M, pred{m} = NaN(nboot, H); end
avg  = NaN(nboot, H);
qaicc = NaN(nboot, M);

for b = 1:nboot
    % --- simulate from each model's own fit, refit, forecast ---
    for m = 1:M
        mu = models{m}.mu;
        lam = randg(theta_nb(m) * ones(size(mu))) .* (mu / theta_nb(m));
        ystar = poisson_rnd(lam);
        try
            Fb = fit_growth_model(models{m}.name, t, ystar, N, t0, models{m}.theta);
            pred{m}(b, :) = (Nf .* growth_model(Fb.name, Fb.theta, tf, t0))';
            k = Fb.k; n = Fb.n;
            qaicc(b, m) = -2 * Fb.loglik / chat + 2 * k + 2 * k * (k + 1) / max(n - k - 1, 1);
        catch
            % leave NaN
        end
    end
    % --- model averaging on this replicate ---
    w = exp(-0.5 * (qaicc(b, :) - min(qaicc(b, :))));
    w(~isfinite(w)) = 0;
    if sum(w) > 0
        w = w / sum(w);
        P = zeros(1, H);
        for m = 1:M
            if w(m) > 0 && all(isfinite(pred{m}(b, :)))
                P = P + w(m) * pred{m}(b, :);
            end
        end
        avg(b, :) = P;
    end
    if mod(b, 100) == 0, fprintf('  bootstrap %d / %d\n', b, nboot); end
end

B = struct();
B.pred = pred; B.avg = avg; B.theta_nb = theta_nb; B.tf = tf;
B.q05 = cell(1, M); B.q50 = cell(1, M); B.q95 = cell(1, M);
for m = 1:M
    B.q05{m} = prctile_local(pred{m}, 5);
    B.q50{m} = prctile_local(pred{m}, 50);
    B.q95{m} = prctile_local(pred{m}, 95);
end
B.avg_q05 = prctile_local(avg, 5);
B.avg_q50 = prctile_local(avg, 50);
B.avg_q95 = prctile_local(avg, 95);
end

function q = prctile_local(X, p)
% column-wise percentile ignoring NaN (linear interpolation, like prctile)
q = NaN(1, size(X, 2));
for j = 1:size(X, 2)
    v = sort(X(~isnan(X(:, j)), j));
    n = numel(v);
    if n == 0, continue; end
    pos = p / 100 * (n - 1) + 1;
    lo = floor(pos); hi = ceil(pos);
    q(j) = v(lo) + (v(hi) - v(lo)) * (pos - lo);
end
end
