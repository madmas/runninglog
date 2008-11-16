require "rubygems"
require "sinatra"
require "haml"
require "lib/GPXStats.rb"
require "lib/caching.rb"

get '/' do
	haml :index
end

get '/list' do
	
	@gpx_files = Dir['public/gpx/*.gpx'].sort.reverse
	
	@gpx_files.each do |file|
	end
	
	haml :list
end

get '/view/*' do
	@filename = params["splat"]
    @gpx = GpxStats.new("public/gpx/" + @filename.to_s)
	mime :gpx, 'text/html'
    cache(haml :details)
end

get '/clearcache' do
#File.delete("public/view/")
end

