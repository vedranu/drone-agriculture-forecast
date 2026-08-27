%DRONE_ENV_PROJECTION_10Y  Year-by-year projection 2026-2035 for the core series
%   and for the six sub-domains, using DRONE_ENV_FORECAST with overrides.
%   Output: ../projection/core/…  and ../projection/<subdomain>/…
%   (forecast_count.csv now has one row per model per year 2026..2035).
%
%   Run:  >> drone_env_projection_10y
%   MATLAB: ~2 min for core (1000 replicates) + ~1 min per sub-domain.

clear; close all;
% NOTE: drone_env_forecast is a script sharing this workspace; use distinctive
% variable names here (proj_*) so the main script does not overwrite them.
proj_base = struct();
proj_base.horizons = 1:10;            % 2026 ... 2035
proj_base.nboot    = 1000;

% --- core series ---
opt_override = proj_base;
opt_override.outdir = fullfile('..', 'projection', 'core');
drone_env_forecast;

% --- sub-domains (fewer replicates; ~1 min each in MATLAB) ---
proj_subs = {'sub_crop_monitoring','sub_spraying','sub_weeds','sub_irrigation','sub_disease_pest','sub_yield','sub_livestock'};
for proj_i = 1:numel(proj_subs)
    opt_override = proj_base;
    opt_override.nboot     = 300;
    opt_override.numerator = proj_subs{proj_i};
    opt_override.outdir    = fullfile('..', 'projection', proj_subs{proj_i});
    opt_override.sensitivity_drop_last = false;
    drone_env_forecast;
end
clear opt_override
fprintf('\nAll projections written to ../projection\n');
