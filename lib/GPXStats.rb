#!/usr/bin/env ruby
require "rubygems"
require "gchart" #gem install googlecharts
require ("lib/geo.rb")

class GpxStats

  def initialize(inputfile)
    start_time = Time.now
    @input = inputfile
    @heartrates = Array.new
    @speeds = Array.new
    @elevations = Array.new
    @times = Array.new
    @Mathwizard = Geo.new
    @last_lat = 0.0
    @last_lon = 0.0
    @start_elevation = 0.0
    @total_dist = 0.0
    @infoString = ""
    @parser = "hpricot"
#    @parser = "nokogiri"

    if (@parser=="hpricot")
    	require 'hpricot'
	doc = Hpricot.parse(File.read(inputfile))
    elsif (@parser == "nokogiri")
	    require 'nokogiri'
	    doc = Nokogiri.Hpricot(File.read(inputfile))
    end
    
    (doc/:trkpt).each do |trackpoint|
      current_time = Time.parse(trackpoint.at("time").inner_text)
      @times.push(current_time)
      current_speed = Float(trackpoint.search("speed").text)
      @speeds.push(current_speed)
      current_elevation = Float(trackpoint.search("ele").text)
      @elevations.push(current_elevation)
      if trackpoint.search("extensions").length > 0 &&  trackpoint.search("gpxdata:hr").length > 0
	current_hr = Float(trackpoint.search("extensions").search("gpxdata:hr").text)
	@heartrates.push(current_hr)	
      end

      current_lat = Float(trackpoint['lat'])
      current_lon = Float(trackpoint['lon'])
  
      #the first trackpoint we analyze doesn't have a @last_lot or @last_lon --> we ignore it
      if !(@last_lat == 0.0)
        #get the distance between the last long/lat pair and the current one
        dist = @Mathwizard.distance_in_m(@last_lat,@last_lon,current_lat,current_lon)
        @total_dist+=dist
      end
      #add the computed distance to the total distance

      #set the current values as the last values
      @last_lat = current_lat
      @last_lon = current_lon

    end
 
    end_time = Time.now
    puts "**Done with the initialization of #{@input.to_s}. It took #{(end_time-start_time).to_s} secs"
  end

  def getTotalDistanceMeters
    return Integer(@total_dist)
  end
  
  def getTotalDistanceKilometers
    return getTotalDistanceMeters/1000
  end

  def getStartTime
    return @times.first
  end

  def getEndTime
    return @times.last
  end

  def getDurationSeconds
    return getEndTime - getStartTime
  end
  
  def getDurationMinutes
    return (getDurationSeconds/60)
  end

  def getDurationHours
    return (getDurationMinutes/60)
  end

  def getAverageSpeed
    return ((getTotalDistanceMeters/getDurationSeconds) * 3.6)
  end

  def getAverageSpeedRounded
    return (((getAverageSpeed * 100).round).to_f / 100)
  end 
  
  def getMaxSpeed
    return @speeds.max
  end

  def getMaxElevation
    return @elevations.max
  end

  def getMinElevation
    return @elevations.min
  end

  def getStartElevation
    return @elevations.first
  end
  
  def getSpeeds
    return @speeds
  end

  def getMaxHR
	return @heartrates.max
  end

  def getMinHR
	return @heartrates.min
  end

  def getAvgHR
	if @heartrates.length>1
		x = 0
		@heartrates.each{|hr| x = x + hr }
		return x/@heartrates.length	
	else
		return 0
	end
  end

  def hasHR
	if @heartrates.length > 1 then
	  true
	else
	  false
	end
  end

  

  def getSpeedGraph
    #we can't send ALL the speeds to the google charts service, so we figure out how we have to divide to get approximately 600
    fraction = 1
    while (@speeds.length / fraction) > 600
      fraction = fraction + 1
    end
    inputdata = @speeds.select {|v| v%fraction==0}
    
    Gchart.line(:size => '400x200',
      :title => "Speed: #{getStartTime.strftime("%d-%m-%Y %H:%M:%S")} (#{Integer((getEndTime-getStartTime)/60).to_s} min)",
      :bg => 'efefef',
      :max_value => getMaxSpeed,
      :min_value => 0,
      :axis_with_labels => ['x','y'],
      :axis_labels => [['0',Integer(getTotalDistanceMeters).to_s+ " m"], ['0 km/h',getMaxSpeed.to_s + "km/h"]],
      :data => inputdata)  #select only the numbers in the array which are divisible by "fraction"
  end

  def getElevationGraph
    #we can't send ALL the elevations to the google charts service, so we figure out how we have to divide to get approximately 600
    fraction = 1
    while (@elevations.length / fraction) > 600
      fraction = fraction + 1
    end
    
    #converting the elevations array to elevations RELATIVE to the minimum elevation
    min_ele = getMinElevation
    relative_elevations = Array.new    
    @elevations.each_index{|x| relative_elevations[x] = @elevations[x] - min_ele}
    inputdata = relative_elevations.select {|v| v%fraction==0}
    Gchart.line(:size => '400x200',
      :title => "Elevation: #{getStartTime.strftime("%d-%m-%Y %H:%M:%S")} (#{Integer((getEndTime-getStartTime)/60).to_s} min)",
      :bg => 'efefef',
      :max_value => relative_elevations.max,
      :min_value => 0,
      :axis_with_labels => ['x','y'],
      :axis_labels => [['0 m',Integer(getTotalDistanceMeters).to_s + " m"], [getMinElevation.to_s + " m",getMaxElevation.to_s + " m"]],
      :data => inputdata)  #select only the numbers in the array which are divisible by "fraction"
   end
   
   def save_yaml_stats_file
   	require 'yaml'
	require 'lib/gpx_stats_model.rb'
	statistics = GPXstatsmodel.new(getTotalDistanceMeters, getDurationSeconds, getAverageSpeedRounded, getMaxSpeed, getMaxElevation, getMinElevation, getMaxElevation - getMinElevation, getMinHR, getMaxHR, getAvgHR)
   
   	aFile = File.new(@input + "_stats.yml", "w")
   	aFile.write(statistics.to_yaml)
   	aFile.close
   	GC.start
   	puts "Saving yml stats file: " + @input.to_s + "_stats.yml"
   end

def getHeartrateGraph
     #we can't send ALL the elevations to the google charts service, so we figure out how we have to divide to get approximately 600
     fraction = 1
     while (@heartrates.length / fraction) > 600
       fraction = fraction + 1
     end

     #converting the elevations array to elevations RELATIVE to the minimum elevation
     min_hr = @heartrates.min
	rel_hr = Array.new
     @heartrates.each_index{|x| rel_hr[x] = @heartrates[x] - min_hr}    
 
     inputdata = rel_hr.select {|v| v%fraction==0}
     Gchart.line(:size => '400x200',
       :title => "Heartrate: #{getStartTime.strftime("%d-%m-%Y %H:%M:%S")} (#{Integer((getEndTime-getStartTime)/60).to_s} min)",
       :bg => 'efefef',
       :max_value => rel_hr.max,
       :min_value => 0,
       :axis_with_labels => ['x','y'],
       :axis_labels => [['0 m',Integer(getTotalDistanceMeters).to_s + " m"], [@heartrates.min.to_s + " bpm",@heartrates.max.to_s + " bpm"]],
       :data => inputdata)  #select only the numbers in the array which are divisible by "fraction"
    end

end
