require "rubygems"
require "sinatra"
require "haml"
require "lib/GPXStats.rb"
require "lib/caching.rb"

mime :gpx, 'text/html'

get '/' do
	haml :index
end

get '/list' do
	#First we get all the gpx files in the gpx directory
    #As they are named e.g. "2008-09-30_14-36-52.gpx", we only have to sort and reverse them to get the newer ones on top
    @gpx_files = Dir['public/gpx/*.gpx'].sort.reverse
    #Now let's enter the list.haml view
	haml :list
end

get '/view/*' do
    #As the cached stuff doesn't seem to be recognized otherwise
    #We get the filename that is attached to the view
    @filename = params["splat"]
    #And parse the file in question, this will take the longest time of them all
    #Will only be called if the file isn't in cache yet!
    @gpx = GpxStats.new("public/gpx/" + @filename.to_s)
    #Now we go into the details.haml view, probably cached thanks to lib/caching.rb (look at the bottom of the resulting pages sourcecode for caching comment)
    cache(haml :details)
end