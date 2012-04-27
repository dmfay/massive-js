{spawn, exec} = require 'child_process'
sys = require 'util'

runCommand = (name, args...) ->
  proc =           spawn name, args
  proc.stderr.on   'data', (buffer) -> console.log buffer.toString()
  proc.stdout.on   'data', (buffer) -> console.log buffer.toString()
  proc.on          'exit', (status) -> process.exit(1) if status isnt 0


task 'watch', 'compiles client CS and LESS', (options) ->
  #runCommand 'sass',   ['--watch', 'public/css/sass:public/css']
  #runCommand 'coffee', '-o','models','-wc', 'coffeescript/models'
  #runCommand 'vows', ['--spec']
  runCommand 'coffee', '-o', 'lib', '-wc', 'lib/coffee'