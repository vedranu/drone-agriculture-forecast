function D = load_annual_data(csvfile)
%LOAD_ANNUAL_DATA  Read the tidy annual CSV (one row = one year) into a struct.
%   D = LOAD_ANNUAL_DATA('openalex_drone_env_annual.csv')
%   Returns a struct with one numeric column vector per CSV column, e.g.
%   D.year, D.core_drone_env, D.env_only, ... plus D.colnames (cell array).
%   Toolbox-free (no readtable): works in MATLAB (R2016b+) and GNU Octave.

fid = fopen(csvfile, 'r');
if fid < 0
    error('load_annual_data:open', 'Cannot open %s', csvfile);
end
header = fgetl(fid);
names = strsplit(strtrim(header), ',');
ncol = numel(names);
fmt = repmat('%f', 1, ncol);
C = textscan(fid, fmt, 'Delimiter', ',', 'CollectOutput', true);
fclose(fid);
M = C{1};

D = struct();
D.colnames = names;
for j = 1:ncol
    D.(sanitise(names{j})) = M(:, j);
end
end

function s = sanitise(s)
% make a valid field name: letters, digits, underscore; must start with a letter
s = regexprep(strtrim(s), '[^A-Za-z0-9_]', '_');
if isempty(s) || ~isletter(s(1))
    s = ['x' s];
end
end
