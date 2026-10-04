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
            pkgs.nodejs_26
          ];
        };
        formatter = pkgs.alejandra;
        packages.default = pkgs.stdenv.mkDerivation {
          name = "shrink";
          version = "0.0.1";

          src = ./.;

          buildInputs = [
            pkgs.nodejs-slim_26
          ];

          buildPhase = "node src/minify.js";

          installPhase = ''
            mv dist $out
          '';
        };
      }
    );
}
