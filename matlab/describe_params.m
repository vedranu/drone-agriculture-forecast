function s = describe_params(F, t0)
th = F.theta;
switch F.name
    case 'exponential'
        s = sprintf('a=%.3g, b=%.4f (%.1f %%/yr)', exp(th(1)), th(2), 100*(exp(th(2))-1));
    case {'logistic', 'gompertz'}
        s = sprintf('K=%.4g, r=%.3f, t_mid=%.1f', exp(th(1)), exp(th(2)), t0 + th(3));
    case 'bass'
        s = sprintf('m=%.4g, p=%.2g, q=%.3f, t_peak=%.1f', exp(th(1)), exp(th(2)), exp(th(3)), t0 - 1 + log(exp(th(3))/exp(th(2)))/(exp(th(2))+exp(th(3))));
    otherwise
        s = mat2str(th, 4);
end
end
