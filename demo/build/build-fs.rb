#!/usr/bin/env ruby

file_packager = File.dirname(`which emcc`.chomp) + "/tools/file_packager"
unless File.exist?(file_packager)
  file_packager = "/usr/share/emscripten/tools/file_packager"
end

files = []
files << "ncurses-6.3/usr/local/share/terminfo/x/xterm-256color@/usr/local/share/terminfo/x/xterm-256color"

Dir.glob("vim81/usr/local/share/vim/vim81/**/*") do |f|
  next if f.start_with?("vim81/usr/local/share/vim/vim81/lang")
  next if f.start_with?("vim81/usr/local/share/vim/vim81/doc")
  files << "#{ f }@#{ f.sub(/\Avim81/, "") }"
end

system(
  file_packager,
  "../static/fs.data",
  "--preload", *files,
  "--js-output=../static/fs.js",
exception: true)
