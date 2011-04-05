require 'rubygems'
require 'sinatra'

root_dir = File.dirname(__FILE__)

Sinatra::Base.set(
  :views  => File.join(root_dir, 'views'),
  :run => false,
  :env => :production
) 

require 'main.rb'
run Sinatra::Application
