let
  # Use unstable nixpkgs
  nixpkgs = fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz";
  pkgs = import nixpkgs {};
in
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    postgresql
  ];
}
