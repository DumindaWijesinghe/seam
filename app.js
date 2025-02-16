let isDrawMode = false;
let isSelectMode = false;
let isPointMode = false;
let startPoint = null;
let tempEndPoint = null;
let lines = []; // Will now store positions in grid units
let points = []; // Store points in grid units
let selectedPoint = null;
let highlightedLine = null;
let nearestPointOnLine = null;
let isSnapMode = true;
let gridSize = 4;
let selectedLine = null;
let selectedHandle = null;
let handleRadius = 8;
let showLengths = true;
let zoomLevel = 1;
let isZoomSliderDragging = false;
let zoomSliderPos = 0.5;
let minZoom = 0.5;
let maxZoom = 4;
let isDraggingLine = false;
let dragStartPoint = null;

// Undo/Redo state
let undoStack = [];
let redoStack = [];

function saveState(action) {
    redoStack = [];
    undoStack.push({
        action: action,
        lines: JSON.parse(JSON.stringify(lines)),
        points: JSON.parse(JSON.stringify(points))
    });
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push({
            lines: JSON.parse(JSON.stringify(lines)),
            points: JSON.parse(JSON.stringify(points))
        });
        let prevState = undoStack.pop();
        lines = prevState.lines;
        points = prevState.points;
        redrawAll();
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push({
            lines: JSON.parse(JSON.stringify(lines)),
            points: JSON.parse(JSON.stringify(points))
        });
        let nextState = redoStack.pop();
        lines = nextState.lines;
        points = nextState.points;
        redrawAll();
    }
}

function keyPressed() {
    if (keyIsDown(CONTROL) && keyCode === 90) {
        if (keyIsDown(SHIFT)) {
            redo();
        } else {
            undo();
        }
        return false;
    }
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(220);
    drawCmGrid(gridSize * zoomLevel);
    noFill();
    stroke(0);

    drawLineButton();
    drawSnapButton();
    drawSelectButton();
    drawPointButton();
    drawZoomSlider();
}

function drawCmGrid(scale) {
    stroke(200);
    strokeWeight(0.5);

    for (let x = 0; x <= width; x += scale) {
        line(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += scale) {
        line(0, y, width, y);
    }

    stroke(150);
    strokeWeight(1);
    for (let x = 0; x <= width; x += scale * 5) {
        line(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += scale * 5) {
        line(0, y, width, y);
    }

    strokeWeight(1);
    stroke(0);
}

function drawBackBodice(x, y, backBodiceLength, backWidth, shoulderLength) {
    line(x, y, x + shoulderLength, y - shoulderLength);
    arc(x, y, 20, 20, PI, 1.5 * PI);
    beginShape();
    vertex(x + shoulderLength, y - shoulderLength);
    bezierVertex(x + shoulderLength + 30, y - shoulderLength + 60, x + backWidth, y + 20, x + backWidth, y + 60);
    endShape();
    line(x, y, x, y + backBodiceLength);
    line(x + backWidth, y + 60, x + backWidth, y + 60 + backBodiceLength);
    line(x, y + 60, x + backWidth, y + 60);
}

function drawFrontBodice(x, y, frontBodiceLength, bust, waist) {
    arc(x, y, 40, 40, PI, 1.5 * PI);
    line(x, y, x + 12 * 2, y - 12 * 2);
    beginShape();
    vertex(x + 24, y - 24);
    bezierVertex(x + 60, y - 30, x + bust * 0.5, y + 10, x + bust * 0.5, y + 40);
    endShape();
    line(x, y, x, y + frontBodiceLength);
    line(x + bust * 0.5, y + 40, x + bust * 0.5, y + 40 + frontBodiceLength);
    line(x, y + 40, x + bust * 0.5, y + 40);
}

function drawLineButton() {
    fill(isDrawMode ? 150 : 200);
    stroke(0);
    rect(20, 20, 40, 40);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('LINE', 40, 40);
    noFill();
}

function drawSnapButton() {
    fill(isSnapMode ? 150 : 200);
    stroke(0);
    rect(70, 20, 40, 40);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('SNAP', 90, 40);
    noFill();
}

function drawSelectButton() {
    fill(isSelectMode ? 150 : 200);
    stroke(0);
    rect(120, 20, 40, 40);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('SELECT', 140, 40);
    noFill();
}

function drawPointButton() {
    fill(isPointMode ? 150 : 200);
    stroke(0);
    rect(170, 20, 40, 40);
    fill(0);
    textSize(12);
    textAlign(CENTER, CENTER);
    text('POINT', 190, 40);
    noFill();
}

function drawZoomSlider() {
    let sliderX = width - 120;
    let sliderY = height - 40;
    let sliderWidth = 100;

    stroke(100);
    strokeWeight(2);
    line(sliderX, sliderY, sliderX + sliderWidth, sliderY);

    let handleX = sliderX + (sliderWidth * zoomSliderPos);
    fill(255);
    stroke(0);
    strokeWeight(1);
    circle(handleX, sliderY, 16);

    noStroke();
    fill(0);
    textAlign(CENTER, BOTTOM);
    textSize(12);
    text(zoomLevel.toFixed(1) + 'x', handleX, sliderY - 10);
}

function updateZoom() {
    zoomLevel = map(zoomSliderPos, 0, 1, minZoom, maxZoom);
    redrawAll();
}

function isOverZoomSlider(mx, my) {
    let sliderX = width - 120;
    let sliderY = height - 40;
    return (mx >= sliderX - 8 && mx <= sliderX + 108 &&
        my >= sliderY - 8 && my <= sliderY + 8);
}

function gridToPixel(point) {
    return {
        x: point.x * gridSize * zoomLevel,
        y: point.y * gridSize * zoomLevel
    };
}

function pixelToGrid(point) {
    return {
        x: point.x / (gridSize * zoomLevel),
        y: point.y / (gridSize * zoomLevel)
    };
}

function snapToGrid(point) {
    if (!isSnapMode) return pixelToGrid(point);
    return {
        x: Math.round(point.x / (gridSize * zoomLevel)),
        y: Math.round(point.y / (gridSize * zoomLevel))
    };
}

function calculateLength(start, end) {
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy).toFixed(1);
}

function drawLineLength(line) {
    let startPx = gridToPixel(line.start);
    let endPx = gridToPixel(line.end);
    let midX = (startPx.x + endPx.x) / 2;
    let midY = (startPx.y + endPx.y) / 2;
    let length = calculateLength(line.start, line.end);
    let scaledTextSize = 12 * Math.sqrt(zoomLevel);
    let strokeOffset = (line === selectedLine && isSelectMode ? 2 : 1) * Math.sqrt(zoomLevel);

    let angle = atan2(endPx.y - startPx.y, endPx.x - startPx.x);

    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    push();
    translate(midX, midY);
    rotate(angle);

    fill(255, 255, 255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(scaledTextSize);
    text(length + 'cm', 0, -strokeOffset - scaledTextSize / 2);

    fill(0);
    text(length + 'cm', 0, -strokeOffset - scaledTextSize / 2);

    pop();
    noFill();
}

function drawHandles(line) {
    let startPx = gridToPixel(line.start);
    let endPx = gridToPixel(line.end);
    let scaledRadius = handleRadius * Math.sqrt(zoomLevel);

    fill(255);
    stroke(0);
    strokeWeight(2 * Math.sqrt(zoomLevel));
    circle(startPx.x, startPx.y, scaledRadius * 2);
    circle(endPx.x, endPx.y, scaledRadius * 2);
    strokeWeight(1);
}

function isOverHandle(point, mx, my) {
    let pointPx = gridToPixel(point);
    let scaledRadius = handleRadius * Math.sqrt(zoomLevel);
    return dist(pointPx.x, pointPx.y, mx, my) < scaledRadius;
}

function drawPoints() {
    for (let p of points) {
        let pointPx = gridToPixel(p);

        // Find if point is on any line
        for (let l of lines) {
            let d = distToSegment(pointPx, gridToPixel(l.start), gridToPixel(l.end));
            if (d < 0.1) {
                // Draw distances to line ends
                let distToStart = calculateLength(p, l.start);
                let distToEnd = calculateLength(p, l.end);

                let scaledTextSize = 10 * Math.sqrt(zoomLevel);
                fill(255, 255, 255, 200);
                noStroke();
                textAlign(LEFT, BOTTOM);
                textSize(scaledTextSize);

                // Draw background for distances
                text(distToStart + 'cm', pointPx.x + 5, pointPx.y - 5);
                text(distToEnd + 'cm', pointPx.x + 5, pointPx.y + 15);

                // Draw text
                fill(0);
                text(distToStart + 'cm', pointPx.x + 5, pointPx.y - 5);
                text(distToEnd + 'cm', pointPx.x + 5, pointPx.y + 15);
                break;
            }
        }

        // Draw the point
        if (p === selectedPoint && isSelectMode) {
            fill(0, 0, 255);
            stroke(0, 0, 255);
            let scaledRadius = 4 * Math.sqrt(zoomLevel);
            circle(pointPx.x, pointPx.y, scaledRadius * 2);
        } else {
            fill(0);
            stroke(0);
            let scaledRadius = 3 * Math.sqrt(zoomLevel);
            circle(pointPx.x, pointPx.y, scaledRadius * 2);
        }
    }
    noFill();

    // Draw preview point with distances when snapping
    if (isPointMode && nearestPointOnLine && highlightedLine) {
        let previewPx = gridToPixel(nearestPointOnLine);

        // Calculate distances to line ends
        let distToStart = calculateLength(nearestPointOnLine, highlightedLine.start);
        let distToEnd = calculateLength(nearestPointOnLine, highlightedLine.end);

        let scaledTextSize = 10 * Math.sqrt(zoomLevel);

        // Draw preview point in blue
        fill(0, 0, 255);
        stroke(0, 0, 255);
        let scaledRadius = 4 * Math.sqrt(zoomLevel);
        circle(previewPx.x, previewPx.y, scaledRadius * 2);

        // Draw background for distances
        fill(255, 255, 255, 200);
        noStroke();
        textAlign(LEFT, BOTTOM);
        textSize(scaledTextSize);
        text(distToStart + 'cm', previewPx.x + 5, previewPx.y - 5);
        text(distToEnd + 'cm', previewPx.x + 5, previewPx.y + 15);

        // Draw text in blue
        fill(0, 0, 255);
        text(distToStart + 'cm', previewPx.x + 5, previewPx.y - 5);
        text(distToEnd + 'cm', previewPx.x + 5, previewPx.y + 15);
    }
}

function getPointOnLine(mousePoint, line) {
    let startPx = gridToPixel(line.start);
    let endPx = gridToPixel(line.end);
    let l2 = dist(startPx.x, startPx.y, endPx.x, endPx.y);
    l2 = l2 * l2;
    if (l2 === 0) return startPx;

    let t = ((mousePoint.x - startPx.x) * (endPx.x - startPx.x) +
        (mousePoint.y - startPx.y) * (endPx.y - startPx.y)) / l2;
    t = Math.max(0, Math.min(1, t));

    return {
        x: startPx.x + t * (endPx.x - startPx.x),
        y: startPx.y + t * (endPx.y - startPx.y)
    };
}

function mouseMoved() {
    if (isDrawMode && startPoint) {
        tempEndPoint = snapToGrid({ x: mouseX, y: mouseY });
        redrawAll();
    } else if (isPointMode) {
        let mousePoint = { x: mouseX, y: mouseY };
        highlightedLine = null;
        nearestPointOnLine = null;
        let minDist = 10 * Math.sqrt(zoomLevel);

        for (let l of lines) {
            let d = distToSegment(mousePoint, gridToPixel(l.start), gridToPixel(l.end));
            if (d < minDist) {
                highlightedLine = l;
                nearestPointOnLine = pixelToGrid(getPointOnLine(mousePoint, l));
                minDist = d;
            }
        }
        redrawAll();
    }
}

function mousePressed() {
    if (isOverZoomSlider(mouseX, mouseY)) {
        isZoomSliderDragging = true;
        let sliderX = width - 120;
        let sliderWidth = 100;
        zoomSliderPos = constrain((mouseX - sliderX) / sliderWidth, 0, 1);
        updateZoom();
        return;
    }

    if (mouseX >= 170 && mouseX <= 210 && mouseY >= 20 && mouseY <= 60) {
        isPointMode = !isPointMode;
        if (isPointMode) {
            isDrawMode = false;
            isSelectMode = false;
            selectedLine = null;
            selectedPoint = null;
        }
        redrawAll();
        return;
    }

    if (mouseX >= 20 && mouseX <= 60 && mouseY >= 20 && mouseY <= 60) {
        isDrawMode = !isDrawMode;
        if (isDrawMode) {
            isSelectMode = false;
            isPointMode = false;
            selectedLine = null;
            selectedPoint = null;
        } else {
            startPoint = null;
            tempEndPoint = null;
        }
        redrawAll();
        return;
    }

    if (mouseX >= 70 && mouseX <= 110 && mouseY >= 20 && mouseY <= 60) {
        isSnapMode = !isSnapMode;
        drawSnapButton();
        return;
    }

    if (mouseX >= 120 && mouseX <= 160 && mouseY >= 20 && mouseY <= 60) {
        isSelectMode = !isSelectMode;
        if (isSelectMode) {
            isDrawMode = false;
            isPointMode = false;
        }
        redrawAll();
        return;
    }

    if (isPointMode) {
        let newPoint;
        if (highlightedLine && nearestPointOnLine) {
            newPoint = nearestPointOnLine;
        } else {
            newPoint = snapToGrid({ x: mouseX, y: mouseY });
        }
        points.push(newPoint);
        saveState('add_point');
        redrawAll();
    } else if (isDrawMode) {
        if (!startPoint) {
            startPoint = snapToGrid({ x: mouseX, y: mouseY });
        } else {
            let endPoint = snapToGrid({ x: mouseX, y: mouseY });
            lines.push({
                start: startPoint,
                end: endPoint
            });
            saveState('add_line');
            startPoint = null;
            tempEndPoint = null;
            redrawAll();
        }
    } else if (isSelectMode) {
        let mousePoint = { x: mouseX, y: mouseY };

        selectedPoint = null;
        for (let p of points) {
            let pointPx = gridToPixel(p);
            if (dist(mousePoint.x, mousePoint.y, pointPx.x, pointPx.y) < 8 * Math.sqrt(zoomLevel)) {
                selectedPoint = p;
                isDraggingLine = false;
                return;
            }
        }

        if (selectedLine) {
            if (isOverHandle(selectedLine.start, mouseX, mouseY)) {
                selectedHandle = 'start';
                isDraggingLine = false;
                return;
            }
            if (isOverHandle(selectedLine.end, mouseX, mouseY)) {
                selectedHandle = 'end';
                isDraggingLine = false;
                return;
            }
        }

        selectedHandle = null;
        selectedLine = null;
        isDraggingLine = false;
        for (let l of lines) {
            let startPx = gridToPixel(l.start);
            let endPx = gridToPixel(l.end);
            let d = distToSegment(mousePoint, startPx, endPx);
            if (d < 5 * Math.sqrt(zoomLevel)) {
                selectedLine = l;
                isDraggingLine = true;
                dragStartPoint = snapToGrid({ x: mouseX, y: mouseY });
                break;
            }
        }
        redrawAll();
    }
}

function mouseDragged() {
    if (isZoomSliderDragging) {
        let sliderX = width - 120;
        let sliderWidth = 100;
        zoomSliderPos = constrain((mouseX - sliderX) / sliderWidth, 0, 1);
        updateZoom();
        return;
    }

    if (isDrawMode) {
        mouseMoved();
    } else if (isSelectMode) {
        if (selectedPoint) {
            let newPos = snapToGrid({ x: mouseX, y: mouseY });
            selectedPoint.x = newPos.x;
            selectedPoint.y = newPos.y;
            redrawAll();
        } else if (selectedLine && selectedHandle) {
            let attachedPoints = findPointsOnLine(selectedLine);

            let newPos = snapToGrid({ x: mouseX, y: mouseY });
            selectedLine[selectedHandle] = newPos;

            updatePointsOnLine(selectedLine, attachedPoints);
            redrawAll();
        } else if (selectedLine && isDraggingLine) {
            let attachedPoints = findPointsOnLine(selectedLine);

            let currentPoint = snapToGrid({ x: mouseX, y: mouseY });
            let dx = currentPoint.x - dragStartPoint.x;
            let dy = currentPoint.y - dragStartPoint.y;

            selectedLine.start = {
                x: selectedLine.start.x + dx,
                y: selectedLine.start.y + dy
            };
            selectedLine.end = {
                x: selectedLine.end.x + dx,
                y: selectedLine.end.y + dy
            };

            updatePointsOnLine(selectedLine, attachedPoints);

            dragStartPoint = currentPoint;
            redrawAll();
        }
    }
}

function mouseReleased() {
    isZoomSliderDragging = false;

    if (isSelectMode && (selectedPoint || (selectedLine && (selectedHandle || isDraggingLine)))) {
        saveState('move');
    }

    isDraggingLine = false;
    dragStartPoint = null;
    if (selectedHandle) {
        selectedHandle = null;
        redrawAll();
    }
}

function redrawAll() {
    background(220);
    drawCmGrid(gridSize * zoomLevel);
    drawLineButton();
    drawSnapButton();
    drawSelectButton();
    drawPointButton();
    drawZoomSlider();

    for (let l of lines) {
        let startPx = gridToPixel(l.start);
        let endPx = gridToPixel(l.end);

        if (l === selectedLine && isSelectMode) {
            stroke(0, 0, 255);
            strokeWeight(2 * Math.sqrt(zoomLevel));
        } else if (l === highlightedLine && isPointMode) {
            stroke(0, 0, 255);
            strokeWeight(2 * Math.sqrt(zoomLevel));
        } else {
            stroke(0);
            strokeWeight(1 * Math.sqrt(zoomLevel));
        }

        line(startPx.x, startPx.y, endPx.x, endPx.y);
        if (l === selectedLine && isSelectMode) {
            drawHandles(l);
        }
        drawLineLength(l);
    }

    if (isPointMode && nearestPointOnLine) {
        let previewPx = gridToPixel(nearestPointOnLine);
        fill(0, 0, 255);
        stroke(0, 0, 255);
        let scaledRadius = 4 * Math.sqrt(zoomLevel);
        circle(previewPx.x, previewPx.y, scaledRadius * 2);
    }

    drawPoints();

    if (isSelectMode && selectedLine && selectedHandle) {
        let previewPos = snapToGrid({ x: mouseX, y: mouseY });
        let previewLine = {
            start: selectedHandle === 'start' ? previewPos : selectedLine.start,
            end: selectedHandle === 'end' ? previewPos : selectedLine.end
        };
        let startPx = gridToPixel(previewLine.start);
        let endPx = gridToPixel(previewLine.end);

        stroke(100, 100, 255, 128);
        strokeWeight(1 * Math.sqrt(zoomLevel));
        line(startPx.x, startPx.y, endPx.x, endPx.y);
        drawLineLength(previewLine);
    }

    if (isDrawMode && startPoint && tempEndPoint) {
        let previewLine = {
            start: startPoint,
            end: tempEndPoint
        };
        let startPx = gridToPixel(previewLine.start);
        let endPx = gridToPixel(previewLine.end);

        stroke(0);
        strokeWeight(1 * Math.sqrt(zoomLevel));
        line(startPx.x, startPx.y, endPx.x, endPx.y);
        drawLineLength(previewLine);
    }
}

function distToSegment(p, v, w) {
    let l2 = dist(v.x, v.y, w.x, w.y);
    l2 = l2 * l2;
    if (l2 === 0) return dist(p.x, p.y, v.x, v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist(p.x, p.y,
        v.x + t * (w.x - v.x),
        v.y + t * (w.y - v.y));
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    background(220);
    drawCmGrid(gridSize * zoomLevel);

    let bust = 86;
    let waist = 68;
    let backWidth = 36;
    let shoulderLength = 12;
    let frontBodiceLength = 42;
    let backBodiceLength = 40;

    let scale = 1;
    bust *= scale;
    waist *= scale;
    backWidth *= scale;
    shoulderLength *= scale;
    frontBodiceLength *= scale;
    backBodiceLength *= scale;

    let centerX = width / 2;
    let centerY = height / 2;

    drawBackBodice(centerX - 150, centerY, backBodiceLength, backWidth, shoulderLength);
    drawFrontBodice(centerX + 150, centerY, frontBodiceLength, bust, waist);
}

function getRelativePositionOnLine(point, line) {
    let startPx = gridToPixel(line.start);
    let endPx = gridToPixel(line.end);
    let pointPx = gridToPixel(point);

    let l2 = dist(startPx.x, startPx.y, endPx.x, endPx.y);
    l2 = l2 * l2;
    if (l2 === 0) return 0;

    let t = ((pointPx.x - startPx.x) * (endPx.x - startPx.x) +
        (pointPx.y - startPx.y) * (endPx.y - startPx.y)) / l2;
    return Math.max(0, Math.min(1, t));
}

function findPointsOnLine(line) {
    return points.filter(p => {
        let pointPx = gridToPixel(p);
        let startPx = gridToPixel(line.start);
        let endPx = gridToPixel(line.end);
        return distToSegment(pointPx, startPx, endPx) < 0.1;
    }).map(p => ({
        point: p,
        position: getRelativePositionOnLine(p, line)
    }));
}

function updatePointsOnLine(line, attachedPoints) {
    for (let ap of attachedPoints) {
        let t = ap.position;
        let startPx = gridToPixel(line.start);
        let endPx = gridToPixel(line.end);

        let newX = startPx.x + t * (endPx.x - startPx.x);
        let newY = startPx.y + t * (endPx.y - startPx.y);

        let newPos = pixelToGrid({ x: newX, y: newY });
        ap.point.x = newPos.x;
        ap.point.y = newPos.y;
    }
} 