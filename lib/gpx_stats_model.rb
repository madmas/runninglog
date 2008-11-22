class GPXstatsmodel
attr_accessor :distance
attr_accessor :duration_s
attr_accessor :speed_avg

def initialize(distance, duration_s, speed_avg, speed_max, elevation_max, elevation_min)
@distance = distance
@duration_s = duration_s
@speed_avg = speed_avg
@speed_max = speed_max
@elevation_max = elevation_max
@elevation_min = elevation_min


end




end