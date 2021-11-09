const MAX_TITLE_LENGTH = 20;
const MILLION = 1000000;
const DATA_URL =
  "https://raw.githubusercontent.com/cse442-21f/A3-Top-Spotify-Songs/main/docs/data/TopSpotifySongs.csv?token=AHRULHHS6BQLOC5JWU72BC3BRQZWG";
const NUM_SONGS = 20;
const ANIMATION_TIME_MS = 400;
const NUM_WEEKS = 43;
// define margins
const MARGIN = {
  top: 10,
  right: 10,
  bottom: 50,
  left: 150,
};
const WIDTH = 1000;
const HEIGHT = 500;

let maxStreams = 0;
let currentlyPlaying = false;

// This maps the week to an array of song
// objects.
const weekToSong = {};

// This maps the week num to the
// week stringified
const numWeekToWeekString = {};

let svg;
let yScale;
let xScale;
let yAxis;
let bars;
const songNameToData = new Map();

/**
 * Produces an interactive visualisation based on the
 * given song data
 * @param {JSON} data - song data, {week : array} object
 * @returns node for visualization
 */
function createVisualization(data, weekStringified) {
  setScrubberWeek(weekStringified);

  // create container SVG element
  svg = d3.create("svg").attr("width", WIDTH).attr("height", HEIGHT);

  // position and populate x and y axis with labels
  xScale = d3
    .scaleLinear()
    .domain([0, maxStreams / MILLION])
    .range([MARGIN.left, WIDTH - MARGIN.right])
    .nice();

  yScale = d3
    .scaleBand()
    .domain(data.map((d) => shortenName(d["Track Name"])))
    .range([0, HEIGHT - MARGIN.bottom])
    .padding(0.25);

  setBars(data, weekStringified);
  addAxis();
  // define tooltip
  d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("background", "white")
    .style("white-space", "pre-wrap")
    .style("visibility", "hidden");

  return svg.node();
}

function setScrubberWeek(weekStringified) {
  document.getElementById("scrubber-label").innerHTML =
    "Week of " + weekStringified;
}

function addAxis() {
  svg
    .append("g")
    .attr("transform", `translate(0, ${HEIGHT - MARGIN.bottom})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("transform", `translate(20, ${-(HEIGHT / 2)}) rotate(-90)`)
    .attr("text-anchor", "center")
    .attr("fill", "black")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Song Title");

  yAxis = svg
    .append("g")
    .attr("transform", `translate(${MARGIN.left}, 0)`)
    .attr("class", "yaxis")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("text-anchor", "center")
    .attr("fill", "black")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT - 10})`)
    .text("Number of Streams (in millions)");
}

function setBars(currentWeekSongData, weekStringified) {
  // create bars for each song
  bars = svg
    .selectAll("rect")
    .data(currentWeekSongData.map((el) => el["Track Name"]))
    .enter()
    .append("rect")
    .attr("x", xScale(0) + 1)
    .attr("y", function (d) {
      return yScale(shortenName(d));
    })
    .attr("height", yScale.bandwidth())
    .on("click", changeSong) // change the song
    .attr("fill", function (d) {
      return getRandomColor(d);
    });

  bars
    .transition()
    .ease(d3.easeLinear)
    .duration(ANIMATION_TIME_MS)
    .attr("width", function (d) {
      return (
        xScale(songNameToData.get(d).get(weekStringified)["Streams"]) / MILLION
      );
    });

  // outline bars and display tooltip on hover
  bars
    .on("mouseover", function (d) {
      d3.mouse(this);
      d3.select(this).attr("stroke", "green").attr("stroke-width", 2);
      d3.select("#tooltip")
        .data(currentWeekSongData)
        .style("visibility", "visible")
        .text(tooltipInfo(d, weekStringified));
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null);
      d3.select("#tooltip").style("visibility", "hidden");
    })
    .on("mousemove", function () {
      d3.select("#tooltip")
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY + 10 + "px");
    });
}

/**
 * Produces shortened version of song titles
 * @param {String} name - full song name
 * @returns full name if under max characters, otherwise shortens
 * and appends "..."
 */
function shortenName(name) {
  return name.length > MAX_TITLE_LENGTH
    ? name.substring(0, MAX_TITLE_LENGTH - 3) + "..."
    : name;
}

/**
 * Concatenates extra information about a song, including
 * title, artist, and number of streams
 * @param {JSON} d - one song's data
 * @returns information to display in tooltip
 */
function tooltipInfo(d, weekStringified) {
  d = songNameToData.get(d).get(weekStringified);
  const formatComma = d3.format(",");
  d3.select("#tooltip").style(
    "box-shadow",
    "2px 4px " + songColors.get(d["Track Name"])
  );
  return (
    "Song Title: " +
    d["Track Name"] +
    "\nArtist: " +
    d["Artist"] +
    "\nStreams: " +
    formatComma(parseInt(d["Streams"]))
  );
}

function changeSong(d) {
  const embed = document.getElementById("spotify-player");
  const week = songNameToData.get(d).keys().next().value;
  embed.src = songNameToData.get(d).get(week)["Embed"];
}

const songColors = new Map();

let songIndex = 0;
function getRandomColor(song) {
  if (songColors.has(song)) {
    return songColors.get(song);
  }
  const color = colors[songIndex++ % colors.length];
  songColors.set(song, color);
  return color;
}

function changeWeek(weekNum) {
  const weekStringified = numWeekToWeekString[weekNum];
  const currentWeekSongData = weekToSong[weekStringified];

  d3.select("#week").attr("value", weekNum);
  let scrubber = document.getElementById("week");
  scrubber.value = weekNum;
  setScrubberWeek(weekStringified);

  yScale.domain(currentWeekSongData.map((el) => shortenName(el["Track Name"])));
  svg
    .select(".yaxis")
    .transition()
    .duration(ANIMATION_TIME_MS)
    .ease(d3.easeLinear)
    .call(d3.axisLeft(yScale));

  bars = bars
    .data(
      currentWeekSongData.map((el) => el["Track Name"]),
      (el) => el
    )
    .join(
      (enter) => {
        return enter
          .append("rect")
          .attr("x", xScale(0) + 1)
          .attr("height", yScale.bandwidth())
          .on("click", changeSong) // change the song
          .attr("fill", function (d) {
            return getRandomColor(d);
          })
          .attr("y", function (d) {
            return yScale(shortenName(d));
          });
      },
      (update) => update,
      (exit) => exit.remove()
    );

  bars
    .transition()
    .duration(ANIMATION_TIME_MS)
    .ease(d3.easeLinear)
    .attr("y", function (d) {
      return yScale(shortenName(d));
    })
    .attr("width", function (d) {
      const dataObj = songNameToData.get(d).get(weekStringified);
      return xScale(dataObj["Streams"]) / MILLION;
    });

  bars
    .on("mouseover", function (d) {
      d3.mouse(this);
      d3.select(this).attr("stroke", "green").attr("stroke-width", 2);
      d3.select("#tooltip")
        .data(currentWeekSongData)
        .style("visibility", "visible")
        .text(tooltipInfo(d, weekStringified));
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null);
      d3.select("#tooltip").style("visibility", "hidden");
    })
    .on("mousemove", function () {
      d3.select("#tooltip")
        .style("left", d3.event.pageX + 10 + "px")
        .style("top", d3.event.pageY + 10 + "px");
    });
}

let id = 0;
function changeAnimationState() {
  let location = document.getElementById("week").getAttribute("value");
  currentlyPlaying = true;
  if (++location == NUM_WEEKS) {
    clearInterval(id);
    currentlyPlaying = false;
    d3.select("#play-btn").text("Play");
  } else {
    changeWeek(location);
  }
}

function playAnimation() {
  if (!currentlyPlaying) {
    const isLastWeek =
      document.getElementById("week").getAttribute("value") == NUM_WEEKS - 1;
    if (isLastWeek) {
      let scrubber = document.getElementById("week");
      scrubber.value = 0;
      changeWeek(0);
    }
    d3.select("#play-btn").text("Pause");
    if (!isLastWeek) changeAnimationState();
    id = setInterval(changeAnimationState, ANIMATION_TIME_MS * 3);
  } else {
    d3.select("#play-btn").text("Play");
    clearInterval(id);
    currentlyPlaying = false;
  }
}

async function init() {
  const data = await d3.csv(DATA_URL);
  const weekData = d3
    .map(data, (d) => d.Week)
    .keys()
    .reverse();
  // map week num to the week string
  for (let i = 0; i < weekData.length; i++) {
    numWeekToWeekString[i] = weekData[i];
  }
  for (const song of data) {
    maxStreams = Math.max(maxStreams, song.Streams);
    if (weekToSong[song["Week"]] === undefined) {
      weekToSong[song["Week"]] = [];
    }
    if (weekToSong[song["Week"]].length >= 20) continue;
    weekToSong[song["Week"]].push(song);

    // load the map
    if (!songNameToData.has(song["Track Name"])) {
      songNameToData.set(song["Track Name"], new Map());
    }
    songNameToData.get(song["Track Name"]).set(song["Week"], song);
  }
  const weekStringified = numWeekToWeekString[0];
  const songData = weekToSong[weekStringified];
  d3.select("g").append(() => createVisualization(songData, weekStringified));
}

init();
