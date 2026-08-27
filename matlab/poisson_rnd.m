function x = poisson_rnd(mu)
%POISSON_RND  Poisson random numbers without the Statistics Toolbox.
%   x = POISSON_RND(mu) returns one Poisson variate per element of mu.
%   Inversion by sequential search for mu < 30 (exact), normal approximation
%   with continuity correction for mu >= 30 (error negligible at these
%   magnitudes compared with the negative-binomial dispersion added on top).

x = zeros(size(mu));
small = mu < 30;
% --- exact inversion (Knuth) for small means ---
idx = find(small);
for ii = idx(:)'
    L = exp(-mu(ii)); k = 0; p = 1;
    while true
        p = p * rand;
        if p <= L, break; end
        k = k + 1;
    end
    x(ii) = k;
end
% --- normal approximation for large means ---
big = ~small;
x(big) = max(0, round(mu(big) + sqrt(mu(big)) .* randn(size(mu(big)))));
end
