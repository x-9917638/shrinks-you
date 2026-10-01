{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    nixpkgs,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        devShells.default = pkgs.mkShellNoCC {
          packages = [
            pkgs.typescript-language-server
          ];
        };
        formatter = pkgs.alejandra;
        packages.default = pkgs.stdenv.mkDerivation {
          name = "shrink";
          version = "0.0.1";

          src = ./src;

          buildInputs = [
            pkgs.nodejs-slim_26
          ];

          buildPhase = "node minify.js";

          installPhase = ''
            mkdir $out
            cp uri.txt $out/
          '';
        };
      }
    );
}
