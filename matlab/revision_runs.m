%REVISION_RUNS  Pre-emptive reviewer-style analyses for the agricultural-drone paper
%  (mirrors the revision of the ecology paper):
%  0. base         - full MATLAB rerun of the default analysis -> ../results (replaces the Octave run)
%  1. sat_counts   - count forecast averaged over the saturating models only (no exponential)
%  2. no2025       - full re-fit on 2005-2024 (counts AND share); forecast years stay 2028/30/32/35
%  3. den_subfield - share with the OpenAlex subfield Agronomy and Crop Science as denominator
%  4. den_field11  - share with the field Agricultural and Biological Sciences as denominator
%  5. den_allworks - share with all indexed works as denominator
%  Run:  >> revision_runs      Output: ../results (base) and ../results_rev/<run>/
clear; close all;
opt_override = struct('nboot', 1000);          % base run, default options
fprintf('\n########## revision run: base ##########\n');
drone_env_forecast;
rev_runs = { ...
  struct('name','sat_counts',  'over', struct('models', {{'logistic','gompertz','bass'}}, 'nboot', 1000, 'sensitivity_drop_last', false)), ...
  struct('name','no2025',      'over', struct('fit_years', [2005 2024], 'horizons', [4 6 8 11], 'nboot', 1000, 'sensitivity_drop_last', false)), ...
  struct('name','den_subfield','over', struct('denominator', 'subfield1102_agronomy', 'nboot', 300, 'sensitivity_drop_last', false)), ...
  struct('name','den_field11', 'over', struct('denominator', 'field11_agbio',        'nboot', 300, 'sensitivity_drop_last', false)), ...
  struct('name','den_allworks','over', struct('denominator', 'all_works',            'nboot', 300, 'sensitivity_drop_last', false)) };
for rev_i = 1:numel(rev_runs)
    opt_override = rev_runs{rev_i}.over;
    opt_override.outdir = fullfile('..', 'results_rev', rev_runs{rev_i}.name);
    fprintf('\n########## revision run: %s ##########\n', rev_runs{rev_i}.name);
    drone_env_forecast;
end
clear opt_override
fprintf('\nAll revision runs done.\n');
