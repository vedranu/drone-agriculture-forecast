%ITEMA_FIGURES  Colour figures for the ITEMA 2026 version of the agro-drone paper.
%   Base MATLAB only (R2023b). Inputs: ../results, ../results_rev/sat_counts, ../data,
%   ../keywords/analysis/*.csv (from itema_build/analyze_keywords.mjs).
%   Outputs: ../figures_itema/fig1..fig5 as .tif (300 dpi, ITEMA requirement) and .png (300 dpi).
here = fileparts(mfilename('fullpath')); root = fileparts(here);
out = fullfile(root, 'figures_itema'); if ~exist(out, 'dir'), mkdir(out); end
ana = fullfile(root, 'keywords', 'analysis');
set(groot, 'defaultAxesFontName', 'Arial', 'defaultTextFontName', 'Arial', 'defaultAxesFontSize', 7);
% Okabe-Ito palette
OI = [0.902 0.624 0.000; 0.337 0.706 0.914; 0.000 0.620 0.451; 0.941 0.894 0.259; ...
      0.000 0.447 0.698; 0.835 0.369 0.000; 0.800 0.475 0.655; 0.35 0.35 0.35];
CM = struct('exponential', OI(6,:), 'logistic', OI(5,:), 'gompertz', OI(3,:), 'bass', OI(7,:));
CAVG = [0.80 0.10 0.15]; CSAT = [0.40 0.22 0.68];
CLU = [0.000 0.447 0.698; 0.000 0.620 0.451; 0.902 0.624 0.000; 0.800 0.475 0.655; 0.835 0.369 0.000; 0.337 0.706 0.914; 0.55 0.55 0.10; 0.45 0.45 0.45];

S = load(fullfile(root, 'results', 'drone_env_forecast_results.mat')); RES = S.RES; opt = S.opt;
Ssat = load(fullfile(root, 'results_rev', 'sat_counts', 'drone_env_forecast_results.mat'));
D = load_annual_data(fullfile(root, 'data', 'openalex_drone_agro_annual.csv'));
keep = D.year >= 2005 & D.year <= 2025 & D.complete_year == 1;
t = D.year(keep); y = D.core_drone_agro(keep); Nd = D.agro_only(keep); share = 1000 * y ./ Nd; t0 = t(1);
tf = t(end) + opt.horizons(:); tt = (t(1):tf(end))';
mname = struct('exponential', 'Exponential', 'logistic', 'Logistic', 'gompertz', 'Gompertz', 'bass', 'Bass');

%% Fig. 1 - (a) annual output with forecasts, (b) share of the agricultural literature
f1 = figure('Units', 'centimeters', 'Position', [2 2 16 7.2], 'Color', 'w');
tl = tiledlayout(f1, 1, 2, 'TileSpacing', 'compact', 'Padding', 'compact');
ax = nexttile(tl); hold(ax, 'on');
B = RES.count.boot; Bs = Ssat.RES.count.boot;
h1 = fill(ax, [tf; flipud(tf)], [B.avg_q05(:); flipud(B.avg_q95(:))], CAVG, 'FaceAlpha', 0.13, 'EdgeColor', 'none');
h2 = fill(ax, [tf; flipud(tf)], [Bs.avg_q05(:); flipud(Bs.avg_q95(:))], CSAT, 'FaceAlpha', 0.16, 'EdgeColor', 'none');
hm = gobjects(1, numel(opt.models));
for m = 1:numel(opt.models)
    F = RES.count.models{m};
    hm(m) = plot(ax, tt, growth_model(F.name, F.theta, tt, t0), '-', 'Color', CM.(F.name), 'LineWidth', 1.1);
end
ho = plot(ax, t, y, 'o', 'MarkerSize', 3.2, 'MarkerFaceColor', [0.15 0.15 0.15], 'MarkerEdgeColor', 'none');
ha = plot(ax, tf, B.avg_q50, 's', 'MarkerSize', 5, 'MarkerFaceColor', CAVG, 'MarkerEdgeColor', 'w');
hs = plot(ax, tf, Bs.avg_q50, 'd', 'MarkerSize', 5, 'MarkerFaceColor', CSAT, 'MarkerEdgeColor', 'w');
set(ax, 'YScale', 'log', 'Box', 'on', 'Layer', 'top'); grid(ax, 'on'); ax.GridAlpha = 0.15; xlim(ax, [2005 2035.5]); ylim(ax, [15 1e5]);
xlabel(ax, 'Year'); ylabel(ax, 'Articles per year (log scale)');
title(ax, '(a) Annual output', 'FontWeight', 'normal', 'FontSize', 8);
legend(ax, [ho hm ha h1 hs h2], [{'Observed'}, cellfun(@(s) mname.(s), opt.models, 'UniformOutput', false), ...
    {'Model average', '90 % interval', 'Saturating average', '90 % interval'}], 'Location', 'northwest', 'FontSize', 5.5, 'Box', 'off', 'NumColumns', 2);

ax = nexttile(tl); hold(ax, 'on');
B = RES.share.boot;
h1 = fill(ax, [tf; flipud(tf)], 1000 * [B.avg_q05(:); flipud(B.avg_q95(:))], CAVG, 'FaceAlpha', 0.13, 'EdgeColor', 'none');
hm = gobjects(1, numel(opt.models_share));
for m = 1:numel(opt.models_share)
    F = RES.share.models{m};
    hm(m) = plot(ax, tt, 1000 * growth_model(F.name, F.theta, tt, t0), '-', 'Color', CM.(F.name), 'LineWidth', 1.1);
end
ho = plot(ax, t, share, 'o', 'MarkerSize', 3.2, 'MarkerFaceColor', [0.15 0.15 0.15], 'MarkerEdgeColor', 'none');
ha = plot(ax, tf, 1000 * B.avg_q50, 's', 'MarkerSize', 5, 'MarkerFaceColor', CAVG, 'MarkerEdgeColor', 'w');
Kl = 1000 * exp(RES.share.models{strcmp(opt.models_share, 'logistic')}.theta(1));
yline(ax, Kl, ':', sprintf('Logistic plateau %.1f', Kl), 'Color', CM.logistic, 'FontSize', 5.5, 'LabelHorizontalAlignment', 'left');
set(ax, 'Box', 'on', 'Layer', 'top'); grid(ax, 'on'); ax.GridAlpha = 0.15; xlim(ax, [2005 2035.5]);
ylim(ax, [0 1000 * max(B.avg_q95) * 1.05]);
xlabel(ax, 'Year'); ylabel(ax, 'UAV articles per 1,000 agricultural articles');
title(ax, '(b) Share of the agricultural literature', 'FontWeight', 'normal', 'FontSize', 8);
legend(ax, [ho hm ha h1], [{'Observed'}, cellfun(@(s) mname.(s), opt.models_share, 'UniformOutput', false), ...
    {'Model average', '90 % interval'}], 'Location', 'northwest', 'FontSize', 5.5, 'Box', 'off');
save_fig(f1, out, 'fig1_growth_forecast');

%% Fig. 2 - sub-domain heatmap (articles per 1,000 core articles), with CAGR 2015-2025 in the labels
yrs = (2010:2025)'; ky = ismember(D.year, yrs); core = D.core_drone_agro(ky);
M = zeros(numel(opt.subdomains), numel(yrs)); lab = cell(numel(opt.subdomains), 1);
for s = 1:numel(opt.subdomains)
    v = D.(opt.subdomains{s})(ky); M(s, :) = 1000 * v ./ core;
    v15 = D.(opt.subdomains{s})(D.year == 2015); v25 = D.(opt.subdomains{s})(D.year == 2025);
    lab{s} = sprintf('%s (%+.0f %%/yr)', opt.subdomain_labels{s}, 100 * ((v25 / v15)^(1 / 10) - 1));
end
[~, ord] = sort(M(:, end), 'descend'); M = M(ord, :); lab = lab(ord);
f2 = figure('Units', 'centimeters', 'Position', [2 2 16 6.2], 'Color', 'w');
hh = heatmap(f2, string(yrs), lab, round(M), 'Colormap', heat_cmap(256), 'CellLabelColor', 'auto', ...
    'FontSize', 6.5, 'GridVisible', 'off', 'ColorbarVisible', 'on');
hh.XLabel = 'Year'; hh.YLabel = ''; hh.Title = '';
save_fig(f2, out, 'fig2_subdomain_heatmap');

%% Fig. 3 - keyword co-occurrence network (Louvain clusters, ForceAtlas2 layout)
Tn = readtable(fullfile(ana, 'network_nodes.csv'), 'TextType', 'string', 'Delimiter', ',');
Te = readtable(fullfile(ana, 'network_edges.csv'), 'TextType', 'string', 'Delimiter', ',');
[~, ia] = ismember(Te.source, Tn.keyword); [~, ib] = ismember(Te.target, Tn.keyword);
nclu = max(Tn.cluster);
% rotate the layout so that its principal axis is horizontal (fits the page width)
XY = [Tn.x Tn.y] - mean([Tn.x Tn.y]); [Vv, Dd] = eig(cov(XY)); [~, im] = max(diag(Dd)); ang = atan2(Vv(2, im), Vv(1, im));
Rm = [cos(-ang) -sin(-ang); sin(-ang) cos(-ang)]; XY = XY * Rm'; Tn.x = XY(:, 1); Tn.y = XY(:, 2);
f3 = figure('Units', 'centimeters', 'Position', [2 2 16 9.6], 'Color', 'w');
ax = axes(f3, 'Position', [0.005 0.11 0.99 0.885]); hold(ax, 'on'); axis(ax, 'equal', 'off');
pad = 0.11 * range(Tn.x); xlim(ax, [min(Tn.x) - pad, max(Tn.x) + pad]); ylim(ax, [min(Tn.y) - 0.05 * range(Tn.x), max(Tn.y) + 0.05 * range(Tn.x)]);
% thematic cluster names, assigned from marker keywords (robust to cluster renumbering)
NAMEMAP = {'pesticide application', 'Spraying and flight operations'; 'hyperspectral imaging', 'Imaging sensors'; 'object detection', 'Computer vision'; ...
    'convolutional neural networks', 'Computer vision'; 'vegetation indices', 'Spectral monitoring and phenotyping'; 'ndvi', 'Spectral monitoring and phenotyping'; ...
    'internet of things', 'Smart farming'; 'precision agriculture', 'Smart farming'};
CLUNAME = cell(1, nclu);
for c = 1:nclu
    kws = lower(Tn.label(Tn.cluster == c));
    for r = 1:size(NAMEMAP, 1), if any(kws == NAMEMAP{r, 1}), CLUNAME{c} = NAMEMAP{r, 2}; break; end, end
    if isempty(CLUNAME{c}), sel = sortrows(Tn(Tn.cluster == c, :), 'freq', 'descend'); CLUNAME{c} = char(sel.label(1)); end
end
[~, eo] = sort(Te.cooc, 'descend'); eo = eo(1:min(320, numel(eo))); eo = flipud(eo);
cmax = max(Te.cooc);
for e = eo'
    a = ia(e); b = ib(e);
    if Tn.cluster(a) == Tn.cluster(b), col = [CLU(Tn.cluster(a), :) 0.30]; else, col = [0.55 0.55 0.55 0.18]; end
    plot(ax, [Tn.x(a) Tn.x(b)], [Tn.y(a) Tn.y(b)], '-', 'Color', col, 'LineWidth', 0.25 + 2.2 * sqrt(Te.cooc(e) / cmax));
end
sz = 25 + 600 * sqrt(Tn.freq / max(Tn.freq));
scatter(ax, Tn.x, Tn.y, sz, CLU(Tn.cluster, :), 'filled', 'MarkerEdgeColor', 'w', 'LineWidth', 0.6, 'MarkerFaceAlpha', 0.92);
fs = 5.0 + 3.0 * sqrt(Tn.freq / max(Tn.freq));
hT = gobjects(height(Tn), 1);
for i = 1:height(Tn)
    hT(i) = text(ax, Tn.x(i), Tn.y(i), char(Tn.label(i)), 'FontSize', fs(i), 'HorizontalAlignment', 'center', ...
        'VerticalAlignment', 'middle', 'Color', [0.08 0.08 0.08], 'Margin', 0.3, 'FontWeight', 'normal');
end
drawnow; repel_labels(hT, 2000);
for i = 1:height(Tn)   % leader line when a label had to move away from its node
    p = hT(i).Position; dd = hypot(p(1) - Tn.x(i), p(2) - Tn.y(i));
    if dd > 0.025 * range(Tn.x), plot(ax, [Tn.x(i) p(1)], [Tn.y(i) p(2)], '-', 'Color', [0.4 0.4 0.4 0.6], 'LineWidth', 0.3); end
end
uistack(hT, 'top');
% legend: cluster number, size and the two most frequent keywords
hl = gobjects(1, nclu); ll = strings(1, nclu);
for c = 1:nclu
    sel = Tn(Tn.cluster == c, :); sel = sortrows(sel, 'freq', 'descend');
    hl(c) = scatter(ax, nan, nan, 40, CLU(c, :), 'filled');
    ll(c) = sprintf('C%d (%d keywords): %s, %s', c, height(sel), sel.label(1), sel.label(min(2, height(sel))));
end
ll = string(arrayfun(@(c) sprintf('C%d %s (%d)', c, CLUNAME{c}, sum(Tn.cluster == c)), 1:nclu, 'UniformOutput', false));
lg = legend(ax, hl, ll, 'FontSize', 6.4, 'Box', 'off', 'NumColumns', min(nclu, 3), 'Units', 'normalized');
lg.Position(1) = (1 - lg.Position(3)) / 2; lg.Position(2) = 0.005;
save_fig(f3, out, 'fig3_cooccurrence_network');

%% Fig. 4 - thematic evolution of keyword clusters (alluvial diagram)
En = readtable(fullfile(ana, 'evolution_nodes.csv'), 'TextType', 'string', 'Delimiter', ',');
El = readtable(fullfile(ana, 'evolution_links.csv'), 'TextType', 'string', 'Delimiter', ',');
% colour of a period cluster = global cluster that holds most of its keywords
gl = lower(Tn.label); En.col = zeros(height(En), 1);
for i = 1:height(En)
    ks = lower(strtrim(split(En.keywords(i), ';'))); [tf_, loc] = ismember(ks, gl);
    if any(tf_), En.col(i) = mode(Tn.cluster(loc(tf_))); else, En.col(i) = size(CLU, 1); end
end
P = unique(En.period)'; nP = numel(P); gap = 0.025; bw = 0.07;
En.x = zeros(height(En), 1); En.y0 = En.x; En.y1 = En.x;
for p = P
    idx = find(En.period == p);
    [~, o] = sortrows([En.col(idx), -En.share_of_period(idx)]); idx = idx(o);
    h = En.share_of_period(idx) * (1 - gap * (numel(idx) - 1)); ytop = 1;
    for k = 1:numel(idx)
        En.x(idx(k)) = p - 1; En.y1(idx(k)) = ytop; En.y0(idx(k)) = ytop - h(k); ytop = ytop - h(k) - gap;
    end
end
[~, s_] = ismember(El.from_id, En.cluster_id); [~, t_] = ismember(El.to_id, En.cluster_id);
sumOut = accumarray(s_, El.weighted_occ, [height(En) 1]); sumIn = accumarray(t_, El.weighted_occ, [height(En) 1]);
th = min((En.y1(s_) - En.y0(s_)) .* El.weighted_occ ./ sumOut(s_), (En.y1(t_) - En.y0(t_)) .* El.weighted_occ ./ sumIn(t_));
f4 = figure('Units', 'centimeters', 'Position', [2 2 16 10], 'Color', 'w');
ax = axes(f4, 'Position', [0.01 0.02 0.98 0.86]); hold(ax, 'on'); axis(ax, 'off');
curOut = En.y1; curIn = En.y1;
[~, lo] = sortrows([s_, -(En.y0(t_) + En.y1(t_))]);
ss = linspace(0, 1, 40); fcurve = (1 - cos(pi * ss)) / 2;
ys0 = zeros(numel(s_), 1); ys1 = ys0;
for k = lo'
    ys1(k) = curOut(s_(k)); ys0(k) = ys1(k) - th(k); curOut(s_(k)) = ys0(k);
end
[~, li] = sortrows([t_, -(En.y0(s_) + En.y1(s_))]); yt0 = zeros(numel(t_), 1); yt1 = yt0;
for k = li'
    yt1(k) = curIn(t_(k)); yt0(k) = yt1(k) - th(k); curIn(t_(k)) = yt0(k);
end
for k = 1:numel(s_)
    xs = En.x(s_(k)) + bw; xt = En.x(t_(k)); xx = xs + ss * (xt - xs);
    top = ys1(k) + fcurve * (yt1(k) - ys1(k)); bot = ys0(k) + fcurve * (yt0(k) - ys0(k));
    patch(ax, [xx fliplr(xx)], [top fliplr(bot)], CLU(En.col(s_(k)), :), 'FaceAlpha', 0.28, 'EdgeColor', 'none');
end
for i = 1:height(En)
    rectangle(ax, 'Position', [En.x(i), En.y0(i), bw, En.y1(i) - En.y0(i)], 'FaceColor', CLU(En.col(i), :), 'EdgeColor', 'w', 'LineWidth', 0.4);
    lb = strrep(char(En.label(i)), ' / ', newline);
    text(ax, En.x(i) + bw + 0.025, (En.y0(i) + En.y1(i)) / 2, lb, 'FontSize', 5.6, 'VerticalAlignment', 'middle', 'Color', [0.1 0.1 0.1]);
end
for p = P
    r = find(En.period == p, 1);
    text(ax, p - 1 + bw / 2, 1.075, sprintf('%s\n(n = %s)', En.period_label(r), format_int(En.n_docs_period(r))), 'FontSize', 7, 'FontWeight', 'bold', 'HorizontalAlignment', 'left');
end
xlim(ax, [-0.05, nP - 1 + 0.98]); ylim(ax, [-0.01 1.13]);
save_fig(f4, out, 'fig4_thematic_evolution');

%% Fig. 5 - keyword x year heatmap (articles per 1,000 corpus articles; colour scaled by row)
H = readtable(fullfile(ana, 'heatmap_keywords.csv'), 'TextType', 'string', 'Delimiter', ',', 'VariableNamingRule', 'preserve', 'ReadVariableNames', true, 'NumHeaderLines', 0);
ycols = H.Properties.VariableNames(5:end); hy = str2double(ycols);
V = H{:, 5:end};
% order: established by 2015-2019 share, emerging by first year above 5 per 1,000
isE = H.group == "emerging"; firstY = zeros(height(H), 1);
for i = 1:height(H), j = find(V(i, :) >= 5, 1); if isempty(j), firstY(i) = hy(end) + 1; else, firstY(i) = hy(j); end, end
oE = find(~isE); [~, a] = sort(firstY(oE)); oE = oE(a);
oM = find(isE); [~, a] = sort(firstY(oM)); oM = oM(a);
ord = [oE; oM]; V = V(ord, :);
rl = H.label(ord); rl(H.group(ord) == "emerging") = rl(H.group(ord) == "emerging") + " *";
xl = string(hy);
f5 = figure('Units', 'centimeters', 'Position', [2 2 16 9.6], 'Color', 'w');
hh = heatmap(f5, xl, rl, round(V, 1), 'Colormap', heat_cmap(256), 'ColorScaling', 'scaledrows', ...
    'CellLabelFormat', '%.0f', 'FontSize', 6, 'GridVisible', 'off');
hh.XLabel = 'Year'; hh.YLabel = ''; hh.Title = '';
save_fig(f5, out, 'fig5_keyword_heatmap');
fprintf('Figures written to %s\n', out);

%% ---------------- local functions ----------------
function save_fig(f, out, name)
exportgraphics(f, fullfile(out, [name '.tif']), 'Resolution', 300);
exportgraphics(f, fullfile(out, [name '.png']), 'Resolution', 300);
end
function c = heat_cmap(n)
% perceptually ordered light-yellow -> orange -> red -> dark purple
k = [1.00 0.98 0.85; 0.99 0.85 0.46; 0.98 0.58 0.25; 0.89 0.29 0.20; 0.70 0.09 0.32; 0.36 0.05 0.40];
c = interp1(linspace(0, 1, size(k, 1)), k, linspace(0, 1, n));
end
function s = format_int(v)
s = regexprep(sprintf('%d', round(v)), '(\d)(?=(\d{3})+$)', '$1,');
end

function repel_labels(hT, iters)
% Push overlapping text labels apart (axis-aligned bounding boxes, data units).
n = numel(hT); E = zeros(n, 4); P = zeros(n, 2);
for i = 1:n, E(i, :) = hT(i).Extent; P(i, :) = hT(i).Position(1:2); end
off = E(:, 1:2) - P;                         % extent offset relative to the anchor
for it = 1:iters
    moved = false;
    for i = 1:n - 1
        for j = i + 1:n
            ox = min(E(i,1) + E(i,3), E(j,1) + E(j,3)) - max(E(i,1), E(j,1));
            oy = min(E(i,2) + E(i,4), E(j,2) + E(j,4)) - max(E(i,2), E(j,2));
            if ox > 0 && oy > 0
                ci = E(i,1:2) + E(i,3:4) / 2; cj = E(j,1:2) + E(j,3:4) / 2;
                if oy <= ox
                    s = sign(ci(2) - cj(2)); if s == 0, s = 1; end
                    d = [0, s * (oy / 2 + 1e-6)];
                else
                    s = sign(ci(1) - cj(1)); if s == 0, s = 1; end
                    d = [s * (ox / 2 + 1e-6), 0];
                end
                d = 0.6 * d;
                E(i,1:2) = E(i,1:2) + d; E(j,1:2) = E(j,1:2) - d; moved = true;
            end
        end
    end
    if ~moved, break; end
end
for i = 1:n
    hT(i).Position(1:2) = E(i, 1:2) - off(i, :);
end
end
