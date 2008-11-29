require "rubygems"
require "sinatra"
require "haml"
require 'yaml'
require "lib/GPXStats.rb"
require "lib/caching.rb"
require 'lib/gpx_stats_model.rb'

mime :gpx, 'text/html'

get '/' do
	erb :index
end

get '/list' do

    @time_start = Time.now
	#First we get all the gpx files in the gpx directory
    #As they are named e.g. "2008-09-30_14-36-52.gpx", we only have to sort and reverse them to get the newer ones on top
    @gpx_files = Dir['public/gpx/*.gpx'].sort.reverse
    @stats_files = Dir['public/gpx/*.gpx_stats.yml'].sort.reverse
    
    @distance = 0
    @duration_s = 0
    
    for statfile in @stats_files
        aFile = File.open( statfile )
        my_YAML = YAML::load( aFile )
        aFile.close
        GC.start
        @distance+=my_YAML.distance
        @duration_s+=my_YAML.duration_s
    
    end
    #Now let's enter the list.erb view
	erb :list
end

get '/update_stats_files' do
    @gpx_files = Dir['public/gpx/*.gpx'].sort.reverse
    for entry in @gpx_files
        GpxStats.new(entry).save_yaml_stats_file
    end
    'Done --> <a href="/">return</a>'
end

get '/view/*' do
    #As the cached stuff doesn't seem to be recognized otherwise
    #We get the filename that is attached to the view
    @filename = params["splat"]
    
    #this should be able to go into the File.exist? part below, but it somehow doesn't work on my server atm
    @gpx = GpxStats.new("public/gpx/" + @filename.to_s)
    
    
    if (!File.exist?("public/gpx/" + @filename.to_s + "_stats.yml"))
    @gpx.save_yaml_stats_file
    haml :details
    elsif
    #Now we go into the details.haml view, probably cached thanks to lib/caching.rb (look at the bottom of the resulting pages sourcecode for caching comment)
    cache(haml :details)
    end
    
end