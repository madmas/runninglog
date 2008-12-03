require "rubygems"
require "sinatra"
require 'yaml'
require "lib/GPXStats.rb"
require 'lib/gpx_stats_model.rb'

mime :gpx, 'text/html'

#if our config is already loaded, we won't load it again
if ($config.nil?)
puts "Loading Config"
$config= YAML::load( File.open( 'config/config.yml' ) )
puts "Loaded Config"
end


get '/' do
    @time_start = Time.now
	#First we get all the gpx files in the gpx directory
    #As they are named e.g. "2008-09-30_14-36-52.gpx", we only have to sort and reverse them to get the newer ones on top
    @gpx_files = Dir['public/gpx/*.gpx'].sort.reverse
    @stats_files = Dir['public/gpx/*.gpx_stats.yml'].sort.reverse
    
    @distance = 0
    @duration_s = 0
    
    for statfile in @stats_files
        my_YAML = YAML::load( File.open( statfile ) )
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

    @filename = params["splat"]
    cached_file = "public/cache/" + @filename.to_s + "_cache.htm"
    
    if (!File.exist?(cached_file))
    #do our calculations
    @gpx = GpxStats.new("public/gpx/" + @filename.to_s)
    #save the yaml file
    @gpx.save_yaml_stats_file
    
    #save the html output to our cache
    File.open(cached_file, 'w') {|f|
    f.write(erb(:details))   
    }  
    end
    #return our cached output
    File.open(cached_file).readlines

    
end
