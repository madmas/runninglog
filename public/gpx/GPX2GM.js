// GPX2GM
// Darstellung von GPS-Daten aus einer GPX-Datei in Google Maps
// Version 2.2
// 30. 6. 2008 Jürgen Berkemeier
// www.j-berkemeier.de

document.write('<script src="http://maps.google.com/maps?file=api&amp;v=2.x&amp;key='+key+'" type="text/javascript"><\/script>');

// PolylineEncoder.js copyright Mark McClure  April/May 2007
// V 2.1  July 2007
// http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoderClass.html
var PolylineEncoder = function() {
  this.numLevels = 18;
  this.zoomFactor = 2;
  this.verySmall = 0.00001;
  this.forceEndpoints = true;
  this.zoomLevelBreaks = new Array(this.numLevels);
  for(var i = 0; i < this.numLevels; i++) {
    this.zoomLevelBreaks[i] = this.verySmall*Math.pow(this.zoomFactor, this.numLevels-i-1);
  }
}
PolylineEncoder.prototype.dpEncode = function(points) {
  var absMaxDist = 0;
  var stack = [];
  var dists = new Array(points.length);
  var maxDist, maxLoc, temp, first, last, current;
  var i, encodedPoints, encodedLevels;
  var segmentLength;

  if(points.length > 2) {
    stack.push([0, points.length-1]);
    while(stack.length > 0) {
      current = stack.pop();
      maxDist = 0;
      segmentLength = Math.pow(points[current[1]].lat()-points[current[0]].lat(),2) +
        Math.pow(points[current[1]].lng()-points[current[0]].lng(),2);
      for(i = current[0]+1; i < current[1]; i++) {
        temp = this.distance(points[i],
          points[current[0]], points[current[1]],
          segmentLength);
        if(temp > maxDist) {
          maxDist = temp;
          maxLoc = i;
          if(maxDist > absMaxDist) {
            absMaxDist = maxDist;
          }
        }
      }
      if(maxDist > this.verySmall) {
        dists[maxLoc] = maxDist;
        stack.push([current[0], maxLoc]);
        stack.push([maxLoc, current[1]]);
      }
    }
  }

  encodedPoints = this.createEncodings(points, dists);
  encodedLevels = this.encodeLevels(points, dists, absMaxDist);
  return {
    encodedPoints: encodedPoints,
    encodedLevels: encodedLevels,
    encodedPointsLiteral: encodedPoints.replace(/\\/g,"\\\\")
  }
}

PolylineEncoder.prototype.dpEncodeToJSON = function(points,
  color, weight, opacity) {
  var result;

  if(!opacity) {
    opacity = 0.9;
  }
  if(!weight) {
    weight = 3;
  }
  if(!color) {
    color = "#0000ff";
  }
  result = this.dpEncode(points);
  return {
    color: color,
    weight: weight,
    opacity: opacity,
    points: result.encodedPoints,
    levels: result.encodedLevels,
    numLevels: this.numLevels,
    zoomFactor: this.zoomFactor
  }
}

PolylineEncoder.prototype.dpEncodeToGPolyline = function(points,
  color, weight, opacity) {
  if(!opacity) {
    opacity = 0.9;
  }
  if(!weight) {
    weight = 3;
  }
  if(!color) {
    color = "#0000ff";
  }
  return new GPolyline.fromEncoded(
    this.dpEncodeToJSON(points, color, weight, opacity));
}

PolylineEncoder.prototype.dpEncodeToGPolygon = function(pointsArray,
  boundaryColor, boundaryWeight, boundaryOpacity,
  fillColor, fillOpacity, fill, outline) {
  var i, boundaries;
  if(!boundaryColor) {
    boundaryColor = "#0000ff";
  }
  if(!boundaryWeight) {
    boundaryWeight = 3;
  }
  if(!boundaryOpacity) {
    boundaryOpacity = 0.9;
  }
  if(!fillColor) {
    fillColor = boundaryColor;
  }
  if(!fillOpacity) {
    fillOpacity = boundaryOpacity/3;
  }
  if(fill==undefined) {
    fill = true;
  }
  if(outline==undefined) {
    outline = true;
  }

  boundaries = new Array(0);
  for(i=0; i<pointsArray.length; i++) {
    boundaries.push(this.dpEncodeToJSON(pointsArray[i],
      boundaryColor, boundaryWeight, boundaryOpacity));
  }
  return new GPolygon.fromEncoded({
    polylines: boundaries,
    color: fillColor,
    opacity: fillOpacity,
    fill: fill,
    outline: outline
  });
}

PolylineEncoder.prototype.distance = function(p0, p1, p2, segLength) {
  var u, out;

  if(p1.lat() === p2.lat() && p1.lng() === p2.lng()) {
    out = Math.sqrt(Math.pow(p2.lat()-p0.lat(),2) + Math.pow(p2.lng()-p0.lng(),2));
  }
  else {
    u = ((p0.lat()-p1.lat())*(p2.lat()-p1.lat())+(p0.lng()-p1.lng())*(p2.lng()-p1.lng()))/
      segLength;

    if(u <= 0) {
      out = Math.sqrt(Math.pow(p0.lat() - p1.lat(),2) + Math.pow(p0.lng() - p1.lng(),2));
    }
    if(u >= 1) {
      out = Math.sqrt(Math.pow(p0.lat() - p2.lat(),2) + Math.pow(p0.lng() - p2.lng(),2));
    }
    if(0 < u && u < 1) {
      out = Math.sqrt(Math.pow(p0.lat()-p1.lat()-u*(p2.lat()-p1.lat()),2) +
        Math.pow(p0.lng()-p1.lng()-u*(p2.lng()-p1.lng()),2));
    }
  }
  return out;
}

PolylineEncoder.prototype.createEncodings = function(points, dists) {
  var i, dlat, dlng;
  var plat = 0;
  var plng = 0;
  var encoded_points = "";

  for(i = 0; i < points.length; i++) {
    if(dists[i] != undefined || i == 0 || i == points.length-1) {
      var point = points[i];
      var lat = point.lat();
      var lng = point.lng();
      var late5 = Math.floor(lat * 1e5);
      var lnge5 = Math.floor(lng * 1e5);
      dlat = late5 - plat;
      dlng = lnge5 - plng;
      plat = late5;
      plng = lnge5;
      encoded_points += this.encodeSignedNumber(dlat) +
        this.encodeSignedNumber(dlng);
    }
  }
  return encoded_points;
}

PolylineEncoder.prototype.computeLevel = function(dd) {
  var lev=0;
  if(dd > this.verySmall) {
    while(dd < this.zoomLevelBreaks[lev]) {
      lev++;
    }
  }
  return lev;
}

PolylineEncoder.prototype.encodeLevels = function(points, dists, absMaxDist) {
  var i;
  var encoded_levels = "";
  if(this.forceEndpoints) {
    encoded_levels += this.encodeNumber(this.numLevels-1)
  } else {
    encoded_levels += this.encodeNumber(
      this.numLevels-this.computeLevel(absMaxDist)-1)
  }
  for(i=1; i < points.length-1; i++) {
    if(dists[i] != undefined) {
      encoded_levels += this.encodeNumber(
        this.numLevels-this.computeLevel(dists[i])-1);
    }
  }
  if(this.forceEndpoints) {
    encoded_levels += this.encodeNumber(this.numLevels-1)
  } else {
    encoded_levels += this.encodeNumber(
      this.numLevels-this.computeLevel(absMaxDist)-1)
  }
  return encoded_levels;
}

PolylineEncoder.prototype.encodeNumber = function(num) {
  var encodeString = "";
  var nextValue, finalValue;
  while (num >= 0x20) {
    nextValue = (0x20 | (num & 0x1f)) + 63;
    encodeString += (String.fromCharCode(nextValue));
    num >>= 5;
  }
  finalValue = num + 63;
  encodeString += (String.fromCharCode(finalValue));
  return encodeString;
}

PolylineEncoder.prototype.encodeSignedNumber = function(num) {
  var sgn_num = num << 1;
  if (num < 0) {
    sgn_num = ~(sgn_num);
  }
  return(this.encodeNumber(sgn_num));
}

PolylineEncoder.latLng = function(y, x) {
        this.y = y;
        this.x = x;
}
PolylineEncoder.latLng.prototype.lat = function() {
        return this.y;
}
PolylineEncoder.latLng.prototype.lng = function() {
        return this.x;
}

PolylineEncoder.pointsToLatLngs = function(points) {
        var i, latLngs;
        latLngs = new Array(0);
        for(i=0; i<points.length; i++) {
                latLngs.push(new PolylineEncoder.latLng(points[i][0], points[i][1]));
        }
        return latLngs;
}

PolylineEncoder.pointsToGLatLngs = function(points) {
        var i, gLatLngs;
        gLatLngs = new Array(0);
        for(i=0; i<points.length; i++) {
                gLatLngs.push(new GLatLng(points[i][0], points[i][1]));
        }
        return gLatLngs;
}

// -----------------------------------------------------------------------------------------------------
// makeMap by Jürgen Berkemeier
function makeMap(ID) {
  var dieses = this;
  var id = ID;
  var load = false
  var latmin=1000,latmax=-1000,lonmin=1000,lonmax=-1000;
  var zoom = 1;
  var bilder;
  var fname,tcol,rcol,maptype;
  var tracks,waypoints,routes;
  var routeNames,trackNames;
  var GPX2GM_Path="";
  var scr = document.getElementsByTagName("script");
  for(var i=0;i<scr.length;i++) if(scr[i].src && scr[i].src.length) {
    var path = scr[i].src;
    var pos = path.search("GPX2GM.js");
    if(pos!=-1) {
      GPX2GM_Path = path.substring(0,pos);
      break;
    }
  }
  var icon = new GIcon();
  icon.image = GPX2GM_Path+"scenic.png";
  icon.shadow = GPX2GM_Path+"shadow.png";
  icon.iconSize = new GSize(21.0, 31.0);
  icon.shadowSize = new GSize(52.0, 29.0);
  icon.iconAnchor = new GPoint(5.0, 30.0);
  icon.infoWindowAnchor = new GPoint(10.0, 5.0);
  var div = document.getElementById(id);
  var w = div.offsetWidth;
  var h = div.offsetHeight;
  var MapHead = document.createElement("div");
  MapHead.id = "map_head"+id;
  MapHead.style.margin = 0;
  MapHead.style.padding = 0;
//  MapHead.style.fontSize = "0.8em";
//  MapHead.style.lineHeight = "1.5em";
  MapHead.appendChild(document.createTextNode(": "));
  var mapdiv = document.createElement("div");
  mapdiv.id = "map_"+id;
  mapdiv.style.width = w+"px";
  while(div.hasChildNodes()) div.removeChild(div.firstChild);
  div.appendChild(MapHead);
  div.appendChild(mapdiv);
  mapdiv.style.height = h-mapdiv.offsetTop+MapHead.offsetTop+"px";
  var map = new GMap2(document.getElementById("map_"+id));
  map.addControl(new GSmallMapControl());
//  map.addControl(new GLargeMapControl());
  map.addMapType(G_PHYSICAL_MAP);
//  map.addControl(new GMapTypeControl());
  map.addControl(new GHierarchicalMapTypeControl());
  map.addControl(new GScaleControl());
  map.enableScrollWheelZoom()
  var polylineEncoder = new PolylineEncoder();
  this.Spur = function(fn,tcl,rcl,mpt) {
    tcol = tcl;
    rcol = rcl;
    maptype = mpt;
    if (fname!=fn) {
      fname = fn;
      GDownloadUrl(fname, function(data, responseCode) {
        if (responseCode != 200 && responseCode != 0 ) {
          alert("Beim Oeffnen der Datei "+fname+" ist der Fehler "+responseCode+" aufgetreten!");
          return;
        }
        dieses.parseGPX(data) ;
        dieses.setMapHead();
        zoom = map.getBoundsZoomLevel(new GLatLngBounds(new GLatLng(latmin,lonmin),new GLatLng(latmax,lonmax))); // sw, ne
        dieses.rescale();
        map.setMapType(maptype);
        dieses.show("wtr");
      } );
    }
    else {
      dieses.show("wtr");
    }
  } // Spur
  var chkwpt,chktrk,chkrt;
  this.setMapHead = function() {
    var name = fname.replace(/.+\//,"");
    MapHead.innerHTML = name+": ";
    if(waypoints.length) {
      if(waypoints.length==1) var texte=new Array("Wegpunkt"+String.fromCharCode(160));
      else if(waypoints.length>1) var texte=new Array("Wegpunkte"+String.fromCharCode(160));
      chkwpt = new JB_CheckBoxGroup(MapHead.id,texte,ID+"_wpt","black",true,dieses.checkBoxes);
    }
    if(tracks.length) {
      var texte=new Array()
      if(tracks.length==1)
        texte[0] = "Track"+String.fromCharCode(160);
      else if(tracks.length>1) {
        texte[0] = "Tracks"+String.fromCharCode(160);
        for(var i=0;i<tracks.length;i++) texte[i+1] = trackNames[i];
      }
      chktrk = new JB_CheckBoxGroup(MapHead.id,texte,ID+"_trk",tcol,true,dieses.checkBoxes);
    }
    if(routes.length) {
      var texte=new Array()
      if(routes.length==1)
        texte[0] = "Route "+String.fromCharCode(160);
      else if(routes.length>1) {
        texte[0] = "Routen "+String.fromCharCode(160);
        for(var i=0;i<routes.length;i++) texte[i+1] = routeNames[i];
      }
      chkrt = new JB_CheckBoxGroup(MapHead.id,texte,ID+"_rt",rcol,true,dieses.checkBoxes);
    }
  } // setMapHead
  this.checkBoxes = function(obj,ele) {
    var what="";
    if(chkwpt && chkwpt.status[0]) what += "w";
    if(chktrk && chktrk.status[0]) what += "t";
    if(chkrt  && chkrt.status[0] ) what += "r";
    dieses.show(what);
  }
  this.parseGPX = function(data) {
    tracks = new Array();
    trackNames = new Array();
    load = false;
    latmin=1000;latmax=-1000;lonmin=1000;lonmax=-1000;
    var xml = GXml.parse(data);
    var trk = xml.documentElement.getElementsByTagName("trk"); // Tracks
    for(var k=0;k<trk.length;k++) {
      var trkseg = trk[k].getElementsByTagName("trkseg"); // Trackssegmente
      var name = trk[k].getElementsByTagName("name");
      if(name.length && name[0].firstChild && name[0].firstChild.length)
        trackNames[k] = name[0].firstChild.data;
      else
        trackNames[k] = "Track "+k;
      for(var j=0;j<trkseg.length;j++) {
        var trkpts = trkseg[j].getElementsByTagName("trkpt"); // Trackpunkte
        var track = new Array();
        for(var i=0;i<trkpts.length;i++) { // Trackdaten
          var lat = parseFloat(trkpts[i].getAttribute("lat"));
          var lon = parseFloat(trkpts[i].getAttribute("lon"));
          if(lat<latmin) latmin=lat; else if(lat>latmax) latmax=lat;
          if(lon<lonmin) lonmin=lon; else if(lon>lonmax) lonmax=lon;
          track.push(new GLatLng(lat,lon));
        }
      }
      tracks.push(track);
    }
    var rte = xml.documentElement.getElementsByTagName("rte"); // Routen
    routes = new Array();
    routeNames = new Array();
    for(var j=0;j<rte.length;j++) {
      var rtepts = rte[j].getElementsByTagName("rtept");
      var route = new Array();
      var name = rte[j].getElementsByTagName("name");
      if(name.length && name[0].firstChild && name[0].firstChild.length)
        routeNames[j] = name[0].firstChild.data;
      else
        routeNames[j] = "Route "+j;
      for(var i=0;i<rtepts.length;i++) { // Zwischenziele
        var lat = parseFloat(rtepts[i].getAttribute("lat"));
        var lon = parseFloat(rtepts[i].getAttribute("lon"));
        if(lat<latmin) latmin=lat; else if(lat>latmax) latmax=lat;
        if(lon<lonmin) lonmin=lon; else if(lon>lonmax) lonmax=lon;
        route.push(new GLatLng(lat,lon));
        var ext = rtepts[i].getElementsByTagName("extensions");
        if(ext.length) {
          var rpts = JB_GetElementsByTagNameNS(ext[0],"gpxx","rpt"); // Routenpunkte
          for(var k=0;k<rpts.length;k++) {
            var lat = parseFloat(rpts[k].getAttribute("lat"));
            var lon = parseFloat(rpts[k].getAttribute("lon"));
            if(lat<latmin) latmin=lat; else if(lat>latmax) latmax=lat;
            if(lon<lonmin) lonmin=lon; else if(lon>lonmax) lonmax=lon;
            route.push(new GLatLng(lat,lon));
          }
        }
      }
      routes.push(route);
    }
    var wpts = xml.documentElement.getElementsByTagName("wpt"); // Waypoints
    waypoints = new Array();
    for(var i=0;i<wpts.length;i++) { // Wegpunktdaten
      var wpt = wpts[i];
      var lat = parseFloat(wpt.getAttribute("lat"));
      var lon = parseFloat(wpt.getAttribute("lon"));
      if(lat<latmin) latmin=lat; else if(lat>latmax) latmax=lat;
      if(lon<lonmin) lonmin=lon; else if(lon>lonmax) lonmax=lon;
      var waypoint = new Object();
      waypoint.lat = lat;
      waypoint.lon = lon;
      waypoint.name = "";
      waypoint.cmt = "";
      waypoint.desc = "";
      var name = wpt.getElementsByTagName("name");
      var cmt = wpt.getElementsByTagName("cmt");
      var desc = wpt.getElementsByTagName("desc");
      if(name.length && name[0].firstChild && name[0].firstChild.length)
        waypoint.name = name[0].firstChild.data;
      if(cmt.length && cmt[0].firstChild && cmt[0].firstChild.length)
        waypoint.cmt = cmt[0].firstChild.data;
      if(desc.length && desc[0].firstChild && desc[0].firstChild.length)
        waypoint.desc = desc[0].firstChild.data;
      waypoints.push(waypoint);
    }
    load = true;
  } // parseGPX
  this.showWpts = function() {
    if (load) {
      delete bilder; bilder = new Array();
      for(var i=0;i<waypoints.length;i++) {
        var waypoint = waypoints[i];
        if(checkImageName(waypoint.name)) {
          bilder[i] = new Image();
          bilder[i].src = waypoint.name;  // Bildurl steckt im Namen
          map.addOverlay(createImgMarker(waypoint));
        }
        else if (waypoint.name.length || waypoint.cmt.length)
          map.addOverlay(createTxtMarker(waypoint));
        else
          map.addOverlay(new GMarker(new GLatLng(waypoint.lat,waypoint.lon)));
      }
    }
  } // showWpts
  this.showTracks = function() {
    if (load) {
      if(tracks.length>1) {
        for(var i=0;i<tracks.length;i++) if(chktrk.status[i+1])
          map.addOverlay(polylineEncoder.dpEncodeToGPolyline(tracks[i],tcol,2,1.0));
      }
      else if(tracks.length==1) {
        if(chktrk.status[0])
          map.addOverlay(polylineEncoder.dpEncodeToGPolyline(tracks[0],tcol,2,1.0));
      }
    }
  } // showTracks
  this.showRoutes = function() {
    if (load) {
      if(routes.length>1) {
        for(var i=0;i<routes.length;i++) if(chkrt.status[i+1])
          map.addOverlay(polylineEncoder.dpEncodeToGPolyline(routes[i],rcol,2,1.0));
      }
      else if(routes.length==1) {
        if(chkrt.status[0])
          map.addOverlay(polylineEncoder.dpEncodeToGPolyline(routes[0],rcol,2,1.0));
      }
    }
  } // showRoutes
  this.show = function(what) {
    map.clearOverlays()
//    dieses.rescale();
    if (what.search("w") != -1 ) dieses.showWpts();
    if (what.search("t") != -1 ) dieses.showTracks();
    if (what.search("r") != -1 ) dieses.showRoutes();
  } // show
  this.rescale = function() {
    if(load) {
      map.setCenter(new GLatLng((latmax+latmin)/2,(lonmax+lonmin)/2), zoom);
    }
  } // rescale
  var createImgMarker = function(waypoint) {
    var marker = new GMarker(new GLatLng(waypoint.lat,waypoint.lon),icon);
    GEvent.addListener(marker, "click", function() {
      marker.openInfoWindowHtml("<img src='"+waypoint.name+"'\/><br\/>"+waypoint.cmt);
    });
    return marker;
  } // createImgMarker
  var createTxtMarker = function(waypoint) {
    var marker = new GMarker(new GLatLng(waypoint.lat,waypoint.lon));
    GEvent.addListener(marker, "click", function() {
      marker.openInfoWindowHtml("<strong>"+waypoint.name+"<\/strong><br\/>"+waypoint.cmt);
    });
    return marker;
  } // createTxtMarker
  var checkImageName = function(url) {
    var ext = url.substr(url.lastIndexOf(".")+1).toLowerCase();
    return (ext=="jpg" || ext=="jpeg" || ext=="png" || ext=="gif") ;
  } //  checkImageName
} // makeMap

function JB_GetElementsByTagNameNS(ele,namespace,name) {
  var alltags = ele.getElementsByTagName("*");
  var tagname = namespace.toLowerCase()+":"+name.toLowerCase()
  var tags = new Array();
  for(var i=0;i<alltags.length;i++) if(alltags[i].nodeName.toLowerCase()==tagname) tags.push(alltags[i]);
  return tags;
} // JB_GetElementsByTagNameNS(ele,namespace,name)
function JB_CheckBoxGroup(id,Texte,Label,Farbe,def_stat,clickFunc) {
  var dieses = this;
  var nbx = Texte.length;
  this.nboxen = nbx;
  this.status = new Array(nbx); for(var i=0;i<nbx;i++) this.status[i] = def_stat ;
  var ele;
  var box=document.createElement("div");
  box.style.position = "absolute";
  box.style.display = "inline";
  box.style.height = "1.4em";
  box.style.overflow = "hidden";
  box.style.backgroundColor = "";
  box.style.zIndex = 1000;
  box.style.margin = "0";
  box.style.padding = "0";
  box.style.color=Farbe;
  box.onmouseover = function() {
    this.style.height = "";
    this.style.overflow = "";
    this.style.backgroundColor = "white";
    this.style.paddingRight = "0.3em";
    this.style.paddingBottom = "0.2em";
  };
  box.onmouseout  = function() {
    this.style.height = "1.4em";
    this.style.overflow = "hidden";
    this.style.backgroundColor = "";
    this.style.paddingRight = "";
    this.style.paddingBottom = "";
  };
  for(var i=0;i<nbx;i++) {
    ele = document.createElement("input");
    ele.type = "checkbox";
    ele.id = Label + i;
    ele.nr = i;
    if(i==0) ele.onclick = function() {
      var l = nbx;
      var n = Label;
      var status = this.checked;
      dieses.status[this.nr] = status;
      for(var j=1;j<l;j++) {
        document.getElementById(n+j).checked=status;
        dieses.status[j] = status;
      }
      clickFunc(dieses,this);
    };
    else     ele.onclick = function() {
      var l = nbx;
      var n = Label;
      var status = false;
      for(var j=1;j<l;j++) status |= document.getElementById(n+j).checked;
      document.getElementById(n+"0").checked = status;
      dieses.status[0] = status==true;
      dieses.status[this.nr] = this.checked;
      clickFunc(dieses,this);
    };
    box.appendChild(ele);
    ele.checked = def_stat;
    box.appendChild(document.createTextNode(Texte[i]));
    if(i<Texte.length-1) box.appendChild(document.createElement("br"));
  }
  ele=document.getElementById(id);
  ele.appendChild(box);
  var spn=document.createElement("span"); // Platzhalter
  spn.appendChild(document.createTextNode(" X "+Texte[0]+" "));
  spn.style.visibility="hidden";
  ele.appendChild(spn);
} // JB_CheckBoxGroup
function JB_addEvent(oTarget, sType, fpDest) {
  var oOldEvent = oTarget[sType];
  if (typeof oOldEvent != "function") {
    oTarget[sType] = fpDest;
  } else {
    oTarget[sType] = function(e) {
      oOldEvent(e);
      fpDest(e);
    }
  }
} // addEvent

JB_addEvent(window,"onload",function() {
  if(document.getElementsByTagName && GBrowserIsCompatible()) {
    var Map_Nr=0;
    var chkTyp = function(typString) {
      if(typString=="Karte") return G_NORMAL_MAP ;
      if(typString=="Satellit") return G_SATELLITE_MAP ;
      if(typString=="Hybrid") return G_HYBRID_MAP ;
      if(typString=="Oberflaeche") return G_PHYSICAL_MAP ;
      return G_SATELLITE_MAP;
    } // chkTyp
    var divs = document.getElementsByTagName("div");
    var typ = G_SATELLITE_MAP;
    for(var i=0;i<divs.length;i++) {
      var div = divs[i];
      if(div.className) {
        var Klasse = div.className;
        var CN = Klasse.toLowerCase().indexOf("gpxview");
        if(CN>-1) {
          if(div.id) var Id = div.id;
          else {
            var Id = "map"+(Map_Nr++);
            div.id = Id;
          }
          var GPX = Klasse.substring(CN).split()[0];
          GPX = GPX.split(":") ;
          if(GPX.length==3) {
            typ = chkTyp(GPX[2]);
          }
          if(GPX[1].length) {
            window["Karte_"+Id] = new makeMap(Id);
            window["Karte_"+Id].Spur(GPX[1],"#ff00ff","#00ffff",typ);
          }
        }
      }
    }
    var buttons = document.getElementsByTagName("button");
    for(var i=0;i<buttons.length;i++) {
      var button = buttons[i];
      if(button.className) {
        var Klasse = button.className;
        var CN = Klasse.toLowerCase().indexOf("gpxview");
        if(CN>-1) {
          var cmd = Klasse.substring(CN).split()[0];
          cmd = cmd.split(":") ;
          if(cmd.length>2) {
            var Id = cmd[1];
            switch(cmd[2]) {
              case "skaliere":
                ( function() {
                  var mapid = "Karte_"+Id;
                  button.onclick = function(){window[mapid].rescale()};
                } )();
                break;
              case "lade":
                if(cmd.length>3) {
                  if(cmd.length>4) typ = chkTyp(cmd[4]);
                  else typ = G_SATELLITE_MAP;
                  ( function() {
                    var fn = cmd[3];
                    var mapid = "Karte_"+Id;
                    var tp = typ;
                    button.onclick = function(){window[mapid].Spur(fn,"#ff00ff","#00ffff",tp)};
                  } )();
                }
                break;
              default:
                break;
            }
          }
        }
      }
    }
    JB_addEvent(window,"onunload",GUnload);
  }
  else alert("Ihr Browser unterstützt nicht die benötigten Methoden!");
});