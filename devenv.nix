{
  pkgs,
  lib,
  config,
  inputs,
  ...
}:

let
  mypkgs = import inputs.nixpkgs {
    system = pkgs.stdenv.system;
    config.allowUnfree = true;
  };

  pkgs-unstable = import inputs.nixpkgs-unstable {
    system = pkgs.stdenv.system;
    config.allowUnfree = true;
  };
in

{
  packages = [
    pkgs-unstable.git
  ];

  languages.javascript = {
    enable = true;
    package = pkgs-unstable.nodejs_22;
  };
}
