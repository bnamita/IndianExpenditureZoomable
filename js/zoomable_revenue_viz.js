var width = 940,
    height = 860,
    radius = height / 2,
    x = d3.scale.linear().range([0, 2 * Math.PI]),
    y = d3.scale.pow().exponent(1.3).domain([0, 1]).range([0, radius]),
    padding = 5,
    duration = 1000,
    centreDepth = 0;

var div = d3.select("#wrapper");

var vis = div.append("svg")
    .attr("width", width + padding * 2)
    .attr("height", height + padding * 2)
    .append("g")
    .attr("transform", "translate(" + [radius + padding, radius + padding] + ")");

var partition = d3.layout.partition()
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, d.y ? y(d.y) : d.y); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

var labelFits = function(d) {
    return x(d.x + d.dx) - x(d.x) > 0.05;
};

var tooltip = d3.select("#info")
    //.append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("opacity", 0);

var totalSize = 0;

d3.json("data/revenue_data.json", function(error, root) {
    var nodes = partition.nodes(root);

    var path = vis.selectAll("path").data(nodes);



    path.enter().append("path")
        .attr("id", function(d, i) { return "path-" + i; })
        .attr("d", arc)
        .attr("fill-rule", "evenodd")
        .style("opacity", 0.85)
        .style("fill", function(d) { return colors(d); })
        .on("mouseover", mouseOver)
        .on("click", function(d){
            return d.depth < 4 ? click(d) : click(d.parent)
        })
        //.on("mouseover", mouseOver)
        //.on("mouseout", mouseOut);
        //.on("mouseover", function(d) {
        //    tooltip.html(function() {
        //        var name = format_name(d);
        //        return name;
        //    });
        //    return tooltip.transition()
        //        .duration(50)
        //        .style("opacity", 0.9);
        //})
        .on("mousemove", function(d) {
            return tooltip
                .style("top", (d3.event.pageY-10)+"px")
                .style("left", (d3.event.pageX-230)+"px");
        })
        .on("mouseout", function(d){
            mouseOut(d);
            d3.select("#info").style('opacity',0);
            //return tooltip.style("opacity", 0);
        });


    totalSize = path.node().__data__.value;

    var text = vis.selectAll("text").data(nodes);
    var textEnter = text.enter().append("text")
        .style("fill-opacity", 1)
        .style("fill", function(d) { return labelFits(d) ? "white" : "none"; })
        .attr("text-anchor", function(d) {
            return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
        })
        .attr("dy", ".35em")
        .attr("transform", function(d) {
            var multiline = (d.name || "").split(" ").length > 1,
                angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90,
                rotate = angle + (multiline ? -.5 : 0);
            return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
        });
    textEnter.append("tspan")
        .attr("x", 0)
        .text(function(d) {
            // Truncate text where necessary for neatness
            var firstLine =  d.name.split(" ")[0];
            if (d.depth && firstLine.length > 30) {
                return firstLine.substring(0,8) + "…"
            } else if (d.depth) {
                return firstLine;
            } else return ""
        });
    textEnter.append("tspan")
        .attr("x", 0)
        .attr("dy", "1.1em")
        .text(function(d) { return d.depth ? d.name.split(" ")[1] || "" : ""; });

    d3.select("svg")
        .append("circle")
        .attr("id","centre-label-background")
        .attr("cx",435)
        .attr("cy",435)
        .attr("r",19)
        .attr("fill","#333")
        .style("opacity",-0.15)
        .attr("pointer-events","none");
    d3.select("svg")
        .append("text")
        .attr("id","centre-label")
        .text("Total Expenditure")
        .attr("x",435)
        .attr("y",440)
        .attr("text-anchor","middle")
        .attr("pointer-events","none");

    function click(d) {
        path.transition()
            .duration(duration)
            .attrTween("d", arcTween(d))
            .each("end", function(d, i) {
                // Once the scales have been updated by arcTween, update the
                // fill style of the label depending on the size of the wedge
                d3.select(text[0][i]).style("fill", function(d) { return labelFits(d) ? "white" : "none"; });
            });

        text.style("visibility", function(e) {
            return isParentOf(d, e) ? null : d3.select(this).style("visibility");
        })
            .transition()
            .duration(duration)
            .attrTween("text-anchor", function(d) {
                return function() {
                    return x(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                };
            })
            .attrTween("transform", function(d) {
                var multiline = (d.name || "").split(" ").length > 1;
                return function() {
                    var angle = x(d.x + d.dx / 2) * 180 / Math.PI - 90, //radians
                        rotate = angle + (multiline ? -.5 : 0);
                    return "rotate(" + rotate + ")translate(" + (y(d.y) + padding) + ")rotate(" + (angle > 90 ? -180 : 0) + ")";
                };
            })
            .style("fill-opacity", function(e) { return isParentOf(d, e) ? 1 : 1e-6; })
            .each("end", function(e) {
                d3.select(this).style("visibility", isParentOf(d, e) ? null : "hidden");
            });
        if (d.depth == 0) {
            d3.select("#splash").style("display","block").transition().duration(750).delay(500).style("opacity",1);
            d3.select("#centre-label").text("Total Expenditure")
                .style("font-family","Guardian-Text-Egyp-Web-Reg-Latin").style("font-size","12px");
        } else {
            d3.select("#splash").transition().duration(750).style("opacity",0).each("end", function() {
                d3.select(this).style("display","none");
            });
            d3.select("#centre-label").attr("class","icon-zoom-out").text("-").style("font-family","FontAwesome").style("font-size","18px");
            d3.select("#centre-label-background").transition().delay(750).style("fill",colors(d.parent))

        }


    }
});


function mouseOver(d) {
    displayDetails(d);
    if (d.depth < 4) d3.select(this).style("cursor","pointer");
    var ancestorArray = getAncestors(d);
    d3.selectAll("path")
        .classed("highlighted-path",false);
    d3.selectAll("path")
        .filter(function(node) { return ancestorArray.indexOf(node) >= 0; })
        .classed("highlighted-path",true);
    d3.select("#centre-label-background").classed("highlighted-path",true);
}

function displayDetails(d) {
    d3.select("#info").transition().duration(750).style("opacity",1);
    var nameText = "";
    switch(d.depth){
        case 4:
            nameText = d.parent.parent.parent.name + " > " + d.parent.parent.name + " > " + d.parent.name + " > ";
            break;
        case 3:
            nameText = d.parent.parent.name + " > " + d.parent.name + " > ";
            break;
        case 2:
            nameText = d.parent.name + " > ";
            break;

    }
   // d3.select("#name").text(nameText);
    d3.select("#segment").text(d.name)//.style("color", colors(d));;
    var amount = Math.round(d.value * 100)/100;
        //percent = Math.round(100 * 100 * amount / 1450.33)/100;
    var percentage = (100 * d.value / totalSize).toPrecision(3);
    var percentageString = percentage + "%";
    if (percentage < 0.005) {
        percentageString = "< 0.1%";
    }
    d3.select("#amount").text(d.value != 0 ? amount + " crores" : " ");
    d3.select("#percent").text(d.value != 0 ? "( " + percentage + "% " : " ")//.style("color", colors(d));
}

function mouseOut(d) {
    d3.selectAll(".highlighted-path").classed("highlighted-path",false)
}


function getAncestors(node) {
    var path = [];
    var current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    path.unshift(current)
    return path;
}

function isParentOf(p, c) {
    if (p === c) return true;
    if (p.children) {
        return p.children.some(function(d) {
            return isParentOf(d, c);
        });
    }
    return false;
}

// Interpolate the scales!
function arcTween(d) {
    var my = maxY(d),
        xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(y.domain(), [d.y, my]),
        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
    return function(d) {
        return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
    };
}

function maxY(d) {
    return d.children ? Math.max.apply(Math, d.children.map(maxY)) : d.y + d.dy;
}

function colors(d) {
    if (d.name == "Non-Plan Expenditure") return "#49AB57";
    if (d.name == "Plan Expenditure") return "#0064A2";
    //if (d.name == "Capital Receipts") return "#D81B1F";

    if (d.parent && d.parent.name == "Non-Plan Expenditure") return "#76B847";
    if (d.parent && d.parent.name == "Plan Expenditure") return "#488FC2";
    //if (d.parent && d.parent.name == "Capital Receipts") return "#E95B2E";

    if (d.parent && d.parent.parent.name == "Non-Plan Expenditure") return "#c2e699";
    if (d.parent && d.parent.parent.name == "Plan Expenditure") return "#bdc9e1";
    //if (d.parent && d.parent.parent.name == "Capital Receipts") return "#fe9929";

    if(d.parent && d.parent.parent && d.parent.parent.parent){
        console.log("parent.parent.parent");
        console.log(d);
        return ({
            "Non-Plan Expenditure": "#ADC946",
            "Plan Expenditure":  "#69C3EA",
            //"Capital Receipts":    "#FFCC4B"
        }[d.parent.parent.parent.name]);
    }
    return "#333";
}

function mouseOut(d) {
    d3.selectAll(".highlighted-path").classed("highlighted-path",false)
}

