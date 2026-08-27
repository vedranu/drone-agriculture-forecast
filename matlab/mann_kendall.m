function R = mann_kendall(t, y)
%MANN_KENDALL  Mann-Kendall trend test and Sen's slope (toolbox-free).
%   R = MANN_KENDALL(t, y) returns a struct with
%     .S      Mann-Kendall statistic
%     .varS   variance of S (with tie correction)
%     .Z      standard normal test statistic (continuity-corrected)
%     .p      two-sided p-value (normal approximation, n >= 10)
%     .tau    Kendall's tau
%     .sen    Sen's slope (median of pairwise slopes, units of y per unit t)
%     .sen_ci 90 % confidence interval of Sen's slope (Gilbert 1987)
%   Reference: Mann (1945), Kendall (1975), Sen (1968), Gilbert (1987).

t = t(:); y = y(:); n = numel(y);
S = 0; slopes = [];
for i = 1:n-1
    for j = i+1:n
        S = S + sign(y(j) - y(i));
        if t(j) ~= t(i)
            slopes(end+1) = (y(j) - y(i)) / (t(j) - t(i)); %#ok<AGROW>
        end
    end
end
% tie correction
[~, ~, grp] = unique(y);
cnt = accumarray(grp, 1);
tie = sum(cnt .* (cnt - 1) .* (2 * cnt + 5));
varS = (n * (n - 1) * (2 * n + 5) - tie) / 18;
if S > 0
    Z = (S - 1) / sqrt(varS);
elseif S < 0
    Z = (S + 1) / sqrt(varS);
else
    Z = 0;
end
p = 2 * (1 - normcdf_local(abs(Z)));
tau = S / (n * (n - 1) / 2);

slopes = sort(slopes);
sen = median(slopes);
% Gilbert (1987) CI for Sen's slope at alpha = 0.10 (z = 1.645)
M = numel(slopes);
C = 1.645 * sqrt(varS);
M1 = round((M - C) / 2); M2 = round((M + C) / 2);
M1 = min(max(M1, 1), M); M2 = min(max(M2, 1), M);
sen_ci = [slopes(M1) slopes(M2)];

R = struct('S', S, 'varS', varS, 'Z', Z, 'p', p, 'tau', tau, ...
           'sen', sen, 'sen_ci', sen_ci, 'n', n);
end

function P = normcdf_local(x)
P = 0.5 * erfc(-x / sqrt(2));
end
