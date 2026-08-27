%DRONE_ENV_FORECAST  Current state and 3/5/7/10-year forecast of drone use in
%   agriculture (agricultural UAVs), from annual OpenAlex counts.
%
%   Pipeline (all toolbox-free; runs in MATLAB and GNU Octave):
%     1. load tidy CSV (one row per year), keep complete years only
%     2. descriptive state: shares, CAGR, Mann-Kendall + Sen, breakpoint
%     3. fit four growth models (exponential, logistic, Gompertz, Bass) to
%        (a) absolute counts and (b) the share of environmental literature
%        by Poisson deviance; compare with QAICc (overdispersed counts)
%     4. rolling-origin backtest (out-of-sample accuracy)
%     5. negative-binomial parametric bootstrap -> 90 % forecast intervals
%        per model and QAICc-weighted model average
%     6. tables (CSV) and figures (PNG + EPS) for the paper
%
%   Edit the OPTIONS block, then run:  >> drone_env_forecast
%   Author: generated for V. U. / MIPRO RTA-DRONES, 2026-08-26.

if ~exist('opt_override', 'var'), clear; end   % a wrapper script may pre-define opt_override (struct) to change OPTIONS
close all;

%% ------------------------------ OPTIONS -------------------------------
opt.csv        = fullfile('..', 'data', 'openalex_drone_agro_annual.csv');
opt.outdir     = fullfile('..', 'results');
opt.fit_years  = [2005 2025];          % inclusive; 2026 is incomplete
opt.horizons   = [3 5 7 10];           % years after the last fitted year
opt.numerator  = 'core_drone_agro';    % dependent variable (counts)
opt.denominator= 'agro_only';          % exposure for the share analysis
opt.models       = {'exponential', 'logistic', 'gompertz', 'bass'};   % for annual counts
opt.models_share = {'exponential', 'logistic', 'gompertz'};           % for the share (Bass is an
                                                                      % adoption-per-period model; not meaningful for a share)
opt.nboot      = 1000;                 % bootstrap replicates (>= 1000 for the paper)
opt.backtest_origins = [2018 2020 2022]; % fit up to origin, test the rest
opt.sensitivity_drop_last = true;      % repeat count fit without 2025 (index artefact)
opt.seed       = 20260826;
opt.subdomains = {'sub_crop_monitoring','sub_spraying','sub_weeds','sub_irrigation','sub_disease_pest','sub_yield','sub_livestock'};
opt.subdomain_labels = {'Crop monitoring/phenotyping','Spraying/application','Weed detection','Irrigation/water stress','Disease & pest detection','Yield prediction','Livestock'};
% --- overrides from a wrapper script (e.g. drone_env_projection_10y.m) ---
if exist('opt_override', 'var') && isstruct(opt_override)
    fn = fieldnames(opt_override);
    for i = 1:numel(fn), opt.(fn{i}) = opt_override.(fn{i}); end
end
%% ----------------------------------------------------------------------

if exist('rng', 'file') || exist('rng', 'builtin'), rng(opt.seed); else, rand('seed', opt.seed); randn('seed', opt.seed); end
if ~exist(opt.outdir, 'dir'), mkdir(opt.outdir); end

D  = load_annual_data(opt.csv);
yr = D.year;
keep = yr >= opt.fit_years(1) & yr <= opt.fit_years(2) & D.complete_year == 1;
t  = yr(keep);
y  = D.(opt.numerator)(keep);
N  = D.(opt.denominator)(keep);
t0 = t(1);
tlast = t(end);
tf = tlast + opt.horizons(:);            % forecast years

fprintf('=== Data: %s / %s, %d-%d (n = %d complete years) ===\n', ...
        opt.numerator, opt.denominator, t(1), t(end), numel(t));

%% ---------------------- 1. DESCRIPTIVE CURRENT STATE --------------------
share = y ./ N * 1000;                          % papers per 1000 agricultural papers
share_drone = y ./ D.drone_only(keep);          % share of all drone papers
cagr = (y(end) / y(1))^(1 / (t(end) - t(1))) - 1;
cagr10 = (y(end) / y(end-10))^(1/10) - 1;
fprintf('Papers %d: %d -> %d: %d\n', t(1), y(1), t(end), y(end));
fprintf('CAGR %d-%d: %.1f %%; last 10 years: %.1f %%\n', t(1), t(end), 100*cagr, 100*cagr10);
fprintf('Share of agricultural literature: %.2f -> %.2f per 1000\n', share(1), share(end));
fprintf('Share of all drone literature: %.1f %% -> %.1f %%\n', 100*share_drone(1), 100*share_drone(end));

MKc = mann_kendall(t, y);
MKs = mann_kendall(t, share);
fprintf('Mann-Kendall (counts): S=%d, Z=%.2f, p=%.2g, Sen slope=%.1f papers/yr [90%% CI %.1f, %.1f]\n', ...
        MKc.S, MKc.Z, MKc.p, MKc.sen, MKc.sen_ci);
fprintf('Mann-Kendall (share):  S=%d, Z=%.2f, p=%.2g, Sen slope=%.3f per-1000/yr [90%% CI %.3f, %.3f]\n', ...
        MKs.S, MKs.Z, MKs.p, MKs.sen, MKs.sen_ci);

SEGc = segmented_loglinear(t, y, [], 4);
SEGs = segmented_loglinear(t, y, N, 4);
fprintf('Breakpoint (counts): %d, growth %.1f%%/yr before vs %.1f%%/yr after (F=%.1f, p~%.3g)\n', ...
        SEGc.tb, 100*SEGc.growth_before, 100*SEGc.growth_after, SEGc.F, SEGc.p_approx);
fprintf('Breakpoint (share):  %d, growth %.1f%%/yr before vs %.1f%%/yr after (F=%.1f, p~%.3g)\n', ...
        SEGs.tb, 100*SEGs.growth_before, 100*SEGs.growth_after, SEGs.F, SEGs.p_approx);

% subdomain table (first year, last year, CAGR over the last 10 years)
fprintf('\nSubdomains (%d vs %d, CAGR last 10 y):\n', tlast-10, tlast);
sub_tab = zeros(numel(opt.subdomains), 3);
for s = 1:numel(opt.subdomains)
    v = D.(opt.subdomains{s})(keep);
    sub_tab(s, :) = [v(end-10) v(end) 100*((v(end)/max(v(end-10),1))^(1/10) - 1)];
    fprintf('  %-32s %6d %6d  %5.1f %%\n', opt.subdomain_labels{s}, sub_tab(s,1), sub_tab(s,2), sub_tab(s,3));
end

%% ---------------------- 2. MODEL FITTING (counts & share) ---------------
targets = {'count', 'share'};
RES = struct();
for tg = 1:2
    if strcmp(targets{tg}, 'count'), Nfit = []; Nf = []; sc = 1; unit = 'papers/yr'; mnames = opt.models;
    else, Nfit = N; Nf = []; sc = 1000; unit = 'per 1000 agro papers'; mnames = opt.models_share; end
    fprintf('\n=== Growth models, target = %s ===\n', targets{tg});
    models = cell(1, numel(mnames));
    for m = 1:numel(mnames)
        models{m} = fit_growth_model(mnames{m}, t, y, Nfit, t0);
    end
    % overdispersion c-hat from the best-fitting 3-parameter (global) model
    chat = Inf;
    for m = 1:numel(models)
        if models{m}.k >= 3 && models{m}.chat < chat, chat = models{m}.chat; end
    end
    chat = max(1, chat);
    qaicc = zeros(1, numel(models));
    for m = 1:numel(models)
        F = models{m}; k = F.k; n = F.n;
        qaicc(m) = -2 * F.loglik / chat + 2 * k + 2 * k * (k + 1) / max(n - k - 1, 1);
    end
    w = exp(-0.5 * (qaicc - min(qaicc))); w = w / sum(w);
    fprintf('Overdispersion c-hat = %.2f\n', chat);
    fprintf('%-12s %3s %12s %10s %8s %8s  parameters\n', 'model', 'k', 'deviance', 'QAICc', 'weight', 'RMSElog');
    for m = 1:numel(models)
        F = models{m};
        fprintf('%-12s %3d %12.1f %10.1f %8.3f %8.3f  %s\n', F.name, F.k, F.deviance, qaicc(m), w(m), F.rmse_log, describe_params(F, t0));
    end
    RES.(targets{tg}).models = models;
    RES.(targets{tg}).qaicc = qaicc;
    RES.(targets{tg}).w = w;
    RES.(targets{tg}).chat = chat;

    % --- backtest ---
    BT = backtest_models(mnames, t, y, Nfit, t0, opt.backtest_origins);
    fprintf('Rolling-origin backtest (origins %s): MAPE %% | bias %% | RMSElog\n', mat2str(opt.backtest_origins));
    for m = 1:numel(mnames)
        fprintf('  %-12s %6.1f %7.1f %8.3f   per-origin MAPE: %s\n', mnames{m}, BT.mape(m), BT.bias(m), BT.rmse_log(m), mat2str(round(BT.detail(m,:)*10)/10));
    end
    RES.(targets{tg}).backtest = BT;

    % --- bootstrap forecast ---
    fprintf('Bootstrap (%d replicates) ...\n', opt.nboot);
    B = nb_bootstrap(models, t, y, Nfit, t0, tf, Nf, opt.nboot, chat);
    RES.(targets{tg}).boot = B;
    fprintf('Forecast (%s, %s) point estimate and 90 %% bootstrap interval:\n', targets{tg}, unit);
    fprintf('%-12s', 'model'); for h = 1:numel(tf), fprintf(' %22d', tf(h)); end; fprintf('\n');
    for m = 1:numel(models)
        F = models{m};
        pt = growth_model(F.name, F.theta, tf, t0);
        fprintf('%-12s', F.name);
        for h = 1:numel(tf)
            fprintf(' %8.4g [%7.4g,%7.4g]', sc*pt(h), sc*B.q05{m}(h), sc*B.q95{m}(h));
        end
        fprintf('\n');
    end
    fprintf('%-12s', 'QAICc-avg');
    for h = 1:numel(tf), fprintf(' %8.4g [%7.4g,%7.4g]', sc*B.avg_q50(h), sc*B.avg_q05(h), sc*B.avg_q95(h)); end
    fprintf('\n');

    % --- write forecast table ---
    fid = fopen(fullfile(opt.outdir, sprintf('forecast_%s.csv', targets{tg})), 'w');
    fprintf(fid, 'model,horizon_years,year,point,q05,q50,q95,qaicc_weight\n');
    for m = 1:numel(models)
        F = models{m}; pt = growth_model(F.name, F.theta, tf, t0);
        for h = 1:numel(tf)
            fprintf(fid, '%s,%d,%d,%.6g,%.6g,%.6g,%.6g,%.4f\n', F.name, opt.horizons(h), tf(h), sc*pt(h), sc*B.q05{m}(h), sc*B.q50{m}(h), sc*B.q95{m}(h), w(m));
        end
    end
    for h = 1:numel(tf)
        fprintf(fid, 'qaicc_average,%d,%d,%.6g,%.6g,%.6g,%.6g,1\n', opt.horizons(h), tf(h), sc*B.avg_q50(h), sc*B.avg_q05(h), sc*B.avg_q50(h), sc*B.avg_q95(h));
    end
    fclose(fid);

    % --- write model table ---
    fid = fopen(fullfile(opt.outdir, sprintf('models_%s.csv', targets{tg})), 'w');
    fprintf(fid, 'model,k,deviance,loglik,QAICc,weight,rmse_log,chat_pearson,backtest_MAPE,backtest_bias,parameters\n');
    for m = 1:numel(models)
        F = models{m};
        fprintf(fid, '%s,%d,%.3f,%.3f,%.3f,%.4f,%.4f,%.3f,%.2f,%.2f,"%s"\n', F.name, F.k, F.deviance, F.loglik, qaicc(m), w(m), F.rmse_log, F.chat, BT.mape(m), BT.bias(m), describe_params(F, t0));
    end
    fclose(fid);
end

%% ---------------------- 3. SENSITIVITY: drop last year -------------------
if opt.sensitivity_drop_last
    fprintf('\n=== Sensitivity: counts without %d ===\n', tlast);
    tt = t(1:end-1); yy = y(1:end-1);
    for m = 1:numel(opt.models)
        F = fit_growth_model(opt.models{m}, tt, yy, [], t0);
        pt = growth_model(F.name, F.theta, tf, t0);
        fprintf('  %-12s dev=%8.1f  forecast %s\n', F.name, F.deviance, mat2str(round(pt')));
    end
end

%% ---------------------- 4. FIGURES -------------------------------------
tt_plot = (t(1):tf(end))';
% Fig. 1 — counts, fits and forecasts (log scale)
figure(1); clf; set(gcf, 'Units', 'centimeters', 'Position', [2 2 8.8 7]);
ls = {'-', '--', '-.', ':'}; mk = {'none', '^', 'v', 'x'}; lw = [0.6 1.0 1.0 1.2];
B = RES.count.boot;
xf = [tf; flipud(tf)]; yf = [B.avg_q05(:); flipud(B.avg_q95(:))];
hfill = fill(xf, yf, [0.8 0.8 0.8], 'EdgeColor', 'none'); hold on;
hobs = semilogy(t, y, 'ko', 'MarkerFaceColor', 'k', 'MarkerSize', 3);
hmod = zeros(1, numel(opt.models));
for m = 1:numel(opt.models)
    F = RES.count.models{m};
    v = growth_model(F.name, F.theta, tt_plot, t0); sub = mod(tt_plot, 5) == 0;
    hmod(m) = semilogy(tt_plot, v, ['k' ls{m}], 'LineWidth', lw(m));
    if ~strcmp(mk{m}, 'none'), semilogy(tt_plot(sub), v(sub), ['k' mk{m}], 'MarkerSize', 3); end
end
havg = semilogy(tf, B.avg_q50, 'ks', 'MarkerFaceColor', 'w', 'MarkerSize', 5, 'LineWidth', 1);
set(gca, 'YScale', 'log');
xlabel('Year'); ylabel(sprintf('Papers per year (%s)', strrep(opt.numerator, '_', '\_')));
legend([hobs hmod havg hfill], [{'observed'}, opt.models, {'model average', '90 % interval (avg.)'}], 'Location', 'northwest', 'FontSize', 6);
set(gca, 'FontSize', 7); xlim([t(1) tf(end)]); grid on;
print(fullfile(opt.outdir, 'fig1_counts_forecast.png'), '-dpng', '-r600');
print(fullfile(opt.outdir, 'fig1_counts_forecast.eps'), '-depsc');

% Fig. 2 — share of environmental literature
figure(2); clf; set(gcf, 'Units', 'centimeters', 'Position', [2 2 8.8 7]);
B = RES.share.boot;
hfill = fill([tf; flipud(tf)], 1000*[B.avg_q05(:); flipud(B.avg_q95(:))], [0.8 0.8 0.8], 'EdgeColor', 'none'); hold on;
hobs = plot(t, share, 'ko', 'MarkerFaceColor', 'k', 'MarkerSize', 3);
hmod = zeros(1, numel(opt.models_share));
for m = 1:numel(opt.models_share)
    F = RES.share.models{m};
    v = 1000 * growth_model(F.name, F.theta, tt_plot, t0); sub = mod(tt_plot, 5) == 0;
    hmod(m) = plot(tt_plot, v, ['k' ls{m}], 'LineWidth', lw(m));
    if ~strcmp(mk{m}, 'none'), plot(tt_plot(sub), v(sub), ['k' mk{m}], 'MarkerSize', 3); end
end
havg = plot(tf, 1000*B.avg_q50, 'ks', 'MarkerFaceColor', 'w', 'MarkerSize', 5, 'LineWidth', 1);
xlabel('Year'); ylabel('Drone papers per 1000 agricultural papers');
ylim([0 1000*max(B.avg_q95)*1.15]);
legend([hobs hmod havg hfill], [{'observed'}, opt.models_share, {'model average', '90 % interval (avg.)'}], 'Location', 'northwest', 'FontSize', 6);
set(gca, 'FontSize', 7); xlim([t(1) tf(end)]); grid on;
print(fullfile(opt.outdir, 'fig2_share_forecast.png'), '-dpng', '-r600');
print(fullfile(opt.outdir, 'fig2_share_forecast.eps'), '-depsc');

% Fig. 3 — subdomains (log scale, distinguishable in greyscale)
figure(3); clf; set(gcf, 'Units', 'centimeters', 'Position', [2 2 8.8 7]);
mk3 = {'o','s','^','d','v','x','+'};
for s = 1:numel(opt.subdomains)
    v = D.(opt.subdomains{s})(keep);
    semilogy(t, max(v, 0.5), ['k-' mk3{s}], 'MarkerSize', 3, 'LineWidth', 0.6); hold on;
end
xlabel('Year'); ylabel('Papers per year (OpenAlex)');
legend(opt.subdomain_labels, 'Location', 'northwest', 'FontSize', 6);
set(gca, 'FontSize', 7); xlim([t(1) t(end)]); grid on;
print(fullfile(opt.outdir, 'fig3_subdomains.png'), '-dpng', '-r600');
print(fullfile(opt.outdir, 'fig3_subdomains.eps'), '-depsc');

save(fullfile(opt.outdir, 'drone_env_forecast_results.mat'), 'RES', 'opt', 'MKc', 'MKs', 'SEGc', 'SEGs', 'sub_tab', '-v7');
fprintf('\nDone. Results written to %s\n', opt.outdir);

