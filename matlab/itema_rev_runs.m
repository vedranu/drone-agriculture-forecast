%ITEMA_REV_RUNS  ITEMA 2026 revision: growth models refitted on the series with residual
%  homonym noise (RPA etc.) removed. The per-year noise share comes from the October 2026
%  record-level retrieval (keywords/works_*.jsonl) and is applied to the August 2026 series.
%  Output: ../results_itema/clean/   Run:  >> itema_rev_runs
clear; close all;
opt_override = struct('csv', fullfile('..', 'data', 'openalex_drone_agro_annual_itema.csv'), ...
    'numerator', 'core_drone_agro_clean', 'nboot', 1000, 'sensitivity_drop_last', true, ...
    'outdir', fullfile('..', 'results_itema', 'clean'));
if ~exist(opt_override.outdir, 'dir'), mkdir(opt_override.outdir); end
drone_env_forecast;
clear opt_override
fprintf('\nITEMA revision run done.\n');
