%ITEMA_FORECAST_FIX  Consistent QAICc model averaging (ITEMA 2026, second review).
%   Problem in NB_BOOTSTRAP: each model was refitted to data simulated from its OWN fit,
%   so the QAICc weights of one replicate compared fits to different data sets and the
%   "model average" drifted towards the steeper models (share 2035: 26.0 per 1,000,
%   although the weighted point average is about 14.5).
%   Fix: (1) point forecast = sum_m w_m * forecast_m with the original QAICc weights;
%        (2) interval = common-data bootstrap: every replicate draws ONE data set from the
%            NB distribution around the weighted-average fit, refits ALL models to it,
%            recomputes the weights and averages the forecasts.
%   Long horizon: share x projected agricultural literature (2025 level, growth 2015-2024).
%   Output: ../results_itema/fixed/forecast_fixed.mat and forecast_fixed.csv
%   Run:  >> itema_forecast_fix
clear; close all;
rng(20261023);
here = fileparts(mfilename('fullpath')); root = fileparts(here);
outdir = fullfile(root, 'results_itema', 'fixed'); if ~exist(outdir, 'dir'), mkdir(outdir); end
S = load(fullfile(root, 'results', 'drone_env_forecast_results.mat')); RES = S.RES; opt = S.opt;
D = load_annual_data(fullfile(root, 'data', 'openalex_drone_agro_annual.csv'));
keep = D.year >= opt.fit_years(1) & D.year <= opt.fit_years(2) & D.complete_year == 1;
t = D.year(keep); y = D.(opt.numerator)(keep); N = D.(opt.denominator)(keep); t0 = t(1);
tf = t(end) + opt.horizons(:); H = numel(tf);
g = (N(t == 2024) / N(t == 2015))^(1 / 9) - 1;
Nproj = N(t == 2025) * (1 + g) .^ (tf - 2025);
fprintf('Denominator growth 2015-2024: %.2f %%/yr; 2025 level %d; projected %s\n', 100 * g, N(t == 2025), mat2str(round(Nproj')));
nboot = 1000;
FX = struct(); FX.tf = tf; FX.Nproj = Nproj; FX.g = g;
targets = {'count', 'share'};
for tg = 1:2
    T = targets{tg}; R = RES.(T); M = numel(R.models);
    names = cellfun(@(F) F.name, R.models, 'UniformOutput', false);
    if strcmp(T, 'share'), Nfit = N; else, Nfit = []; end
    P = zeros(M, H);
    for m = 1:M, F = R.models{m}; P(m, :) = growth_model(F.name, F.theta, tf, t0)'; end
    w = R.w(:)';
    sat = ~strcmp(names, 'exponential'); wsat = w .* sat; wsat = wsat / sum(wsat);
    pt = w * P; ptsat = wsat * P;
    mu = zeros(size(y)); for m = 1:M, mu = mu + w(m) * R.models{m}.mu; end
    alpha = max(sum((y - mu).^2 - mu) / sum(mu.^2), 1e-6); th = 1 / alpha;
    A = NaN(nboot, H); Asat = NaN(nboot, H); Pm = NaN(nboot, H, M); Wb = NaN(nboot, M);
    fprintf('\n=== %s: common-data bootstrap (%d replicates) ===\n', T, nboot);
    for b = 1:nboot
        lam = randg(th * ones(size(mu))) .* (mu / th); ys = poisson_rnd(lam);
        q = NaN(1, M);
        for m = 1:M
            try
                Fb = fit_growth_model(R.models{m}.name, t, ys, Nfit, t0, R.models{m}.theta);
                Pm(b, :, m) = growth_model(Fb.name, Fb.theta, tf, t0)';
                q(m) = -2 * Fb.loglik / R.chat + 2 * Fb.k + 2 * Fb.k * (Fb.k + 1) / max(Fb.n - Fb.k - 1, 1);
            catch
            end
        end
        Pb = reshape(Pm(b, :, :), H, M);
        ok = isfinite(q) & all(isfinite(Pb), 1);
        if ~any(ok), continue; end
        wb = zeros(1, M); wb(ok) = exp(-0.5 * (q(ok) - min(q(ok)))); wb = wb / sum(wb);
        Pb(:, ~ok) = 0; A(b, :) = wb * Pb'; Wb(b, :) = wb;
        okS = ok & sat;
        if any(okS)
            ws = zeros(1, M); ws(okS) = exp(-0.5 * (q(okS) - min(q(okS)))); ws = ws / sum(ws);
            Asat(b, :) = ws * Pb';
        end
        if mod(b, 200) == 0, fprintf('  %d / %d\n', b, nboot); end
    end
    sc = 1; if strcmp(T, 'share'), sc = 1000; end
    Z = struct('names', {names}, 'w', w, 'point', P, 'avg_point', pt, 'sat_point', ptsat, ...
        'avg_q05', pc(A, 5), 'avg_q50', pc(A, 50), 'avg_q95', pc(A, 95), ...
        'sat_q05', pc(Asat, 5), 'sat_q50', pc(Asat, 50), 'sat_q95', pc(Asat, 95), 'Wb_mean', mean(Wb, 1, 'omitnan'));
    Z.model_q05 = zeros(M, H); Z.model_q95 = zeros(M, H);
    for m = 1:M, Z.model_q05(m, :) = pc(Pm(:, :, m), 5); Z.model_q95(m, :) = pc(Pm(:, :, m), 95); end
    FX.(T) = Z;
    fprintf('weights %s ; mean bootstrap weights %s\n', mat2str(round(w, 4)), mat2str(round(Z.Wb_mean, 3)));
    for h = 1:H
        fprintf('%d  avg %.4g [%.4g, %.4g] (boot median %.4g) | sat %.4g [%.4g, %.4g]\n', tf(h), sc * pt(h), sc * Z.avg_q05(h), sc * Z.avg_q95(h), sc * Z.avg_q50(h), sc * ptsat(h), sc * Z.sat_q05(h), sc * Z.sat_q95(h));
    end
end
% long horizon: share x projected denominator
Sh = FX.share; il = strcmp(Sh.names, 'logistic');
FX.long.avg = Sh.avg_point(:) .* Nproj; FX.long.avg_q05 = Sh.avg_q05(:) .* Nproj; FX.long.avg_q95 = Sh.avg_q95(:) .* Nproj;
FX.long.logistic = Sh.point(il, :)' .* Nproj; FX.long.log_q05 = Sh.model_q05(il, :)' .* Nproj; FX.long.log_q95 = Sh.model_q95(il, :)' .* Nproj;
fprintf('\n=== Long horizon: share x projected denominator ===\n');
for h = 1:H
    fprintf('%d  avg %6.0f [%6.0f, %6.0f] | logistic %6.0f [%6.0f, %6.0f]\n', tf(h), FX.long.avg(h), FX.long.avg_q05(h), FX.long.avg_q95(h), FX.long.logistic(h), FX.long.log_q05(h), FX.long.log_q95(h));
end
save(fullfile(outdir, 'forecast_fixed.mat'), 'FX', '-v7');
fid = fopen(fullfile(outdir, 'forecast_fixed.csv'), 'w');
fprintf(fid, 'quantity,year,point,q05,q95\n');
C = FX.count; Sh = FX.share;
for h = 1:H
    fprintf(fid, 'count_avg,%d,%.1f,%.1f,%.1f\n', tf(h), C.avg_point(h), C.avg_q05(h), C.avg_q95(h));
    fprintf(fid, 'count_sat_avg,%d,%.1f,%.1f,%.1f\n', tf(h), C.sat_point(h), C.sat_q05(h), C.sat_q95(h));
    fprintf(fid, 'share_avg_per1000,%d,%.3f,%.3f,%.3f\n', tf(h), 1000 * Sh.avg_point(h), 1000 * Sh.avg_q05(h), 1000 * Sh.avg_q95(h));
    fprintf(fid, 'long_share_avg_x_den,%d,%.0f,%.0f,%.0f\n', tf(h), FX.long.avg(h), FX.long.avg_q05(h), FX.long.avg_q95(h));
    fprintf(fid, 'long_logistic_x_den,%d,%.0f,%.0f,%.0f\n', tf(h), FX.long.logistic(h), FX.long.log_q05(h), FX.long.log_q95(h));
end
fclose(fid);
fprintf('\nWritten %s\n', outdir);

function q = pc(X, p)
q = NaN(1, size(X, 2));
for j = 1:size(X, 2)
    v = sort(X(~isnan(X(:, j)), j)); n = numel(v);
    if n == 0, continue; end
    pos = p / 100 * (n - 1) + 1; lo = floor(pos); hi = ceil(pos);
    q(j) = v(lo) + (v(hi) - v(lo)) * (pos - lo);
end
end
