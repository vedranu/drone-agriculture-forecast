function R = segmented_loglinear(t, y, N, min_seg)
%SEGMENTED_LOGLINEAR  One-breakpoint piecewise log-linear trend (grid search).
%   R = SEGMENTED_LOGLINEAR(t, y, N, min_seg)
%   Fits log(y/N) = a + b1*(t-t0) + b2*max(t-tb,0) by OLS for every
%   candidate breakpoint tb (leaving at least min_seg years per segment),
%   keeps the tb with minimum SSE, and tests it against the single-slope
%   model with an F-test (Chow-type; the p-value is approximate because tb
%   is estimated — report it as such, or confirm with Davies' test in R).
%   Returns annual growth rates before/after the break (exp(b)-1).

t = t(:); y = y(:);
if isempty(N), N = ones(size(y)); else, N = N(:); end
z = log((y + 0.5) ./ N);
n = numel(t);
t0 = t(1);
X0 = [ones(n,1) (t - t0)];
b0 = X0 \ z; sse0 = sum((z - X0*b0).^2);

best = struct('tb', NaN, 'sse', Inf, 'b', []);
cands = t(min_seg+1 : n-min_seg);
for c = cands'
    X = [ones(n,1) (t - t0) max(t - c, 0)];
    b = X \ z; sse = sum((z - X*b).^2);
    if sse < best.sse, best.tb = c; best.sse = sse; best.b = b; end
end
df1 = 2; df2 = n - 4;   % extra parameters: slope change + break location
Fstat = ((sse0 - best.sse) / df1) / (best.sse / df2);
p = 1 - fcdf_local(Fstat, df1, df2);

R = struct();
R.tb = best.tb; R.F = Fstat; R.p_approx = p;
R.growth_before = exp(best.b(2)) - 1;
R.growth_after  = exp(best.b(2) + best.b(3)) - 1;
R.growth_single = exp(b0(2)) - 1;
R.sse_single = sse0; R.sse_segmented = best.sse;
end

function P = fcdf_local(x, d1, d2)
% F cdf via the regularised incomplete beta function (betainc is base MATLAB)
if x <= 0, P = 0; return; end
P = betainc(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
end
