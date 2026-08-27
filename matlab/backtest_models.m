function T = backtest_models(model_names, t, y, N, t0, origins)
%BACKTEST_MODELS  Rolling-origin out-of-sample evaluation of growth models.
%   T = BACKTEST_MODELS(names, t, y, N, t0, origins)
%   For each origin year o in `origins`, every model is fitted on years
%   t <= o and evaluated on years t > o (all remaining years).  Reports
%   MAPE (%), RMSE on log(1+y) and mean bias (%) per model, averaged over
%   origins, plus the per-origin detail.
%
%   Output struct T: .names .mape (M x 1) .rmse_log (M x 1) .bias (M x 1)
%                    .detail (M x numel(origins)) MAPE per origin

t = t(:); y = y(:);
if isempty(N), N = ones(size(y)); else, N = N(:); end
M = numel(model_names); O = numel(origins);
mape = NaN(M, O); rmsel = NaN(M, O); bias = NaN(M, O);
for o = 1:O
    tr = t <= origins(o); te = t > origins(o);
    if nnz(te) == 0, continue; end
    for m = 1:M
        F = fit_growth_model(model_names{m}, t(tr), y(tr), N(tr), t0);
        yhat = N(te) .* growth_model(F.name, F.theta, t(te), t0);
        e = (yhat - y(te)) ./ y(te);
        mape(m, o)  = 100 * mean(abs(e));
        bias(m, o)  = 100 * mean(e);
        rmsel(m, o) = sqrt(mean((log1p(yhat) - log1p(y(te))).^2));
    end
end
T = struct();
T.names = model_names; T.origins = origins;
T.detail = mape;
T.mape = mean(mape, 2, 'omitnan');
T.rmse_log = mean(rmsel, 2, 'omitnan');
T.bias = mean(bias, 2, 'omitnan');
end
