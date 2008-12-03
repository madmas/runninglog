class GPXstatsmodel
attr_accessor :distance
attr_accessor :duration_s
attr_accessor :speed_avg
attr_accessor :elevation_diff
attr_accessor :hr_max
attr_accessor :hr_avg


  def initialize(distance, duration_s, speed_avg, speed_max, elevation_max, elevation_min, ele_diff, hr_min, hr_max, hr_avg)
    @distance = distance
    @duration_s = duration_s
    @speed_avg = speed_avg
    @speed_max = speed_max
    @elevation_max = elevation_max
    @elevation_min = elevation_min
    @elevation_diff = ele_diff
    @hr_min = hr_min
    @hr_max = hr_max
    @hr_avg = hr_avg
  end

end
