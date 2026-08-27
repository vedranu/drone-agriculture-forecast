MATLAB skripte — agrodronovi: trenutno stanje i predviđanje (3/5/7/10 g.)
=========================================================================
Ista pipeline kao za dronove u ekologiji; ulaz: ../data/openalex_drone_agro_annual.csv
(brojnik core_drone_agro, nazivnik agro_only, 7 poddomena).
  >> cd matlab
  >> drone_env_forecast            % rezultati u ../results (1000 bootstrap replika)
  >> drone_env_projection_10y      % projekcija 2026-2035 u ../projection
Bez toolboxa. Brzi test: opt.nboot = 50.
