let isDrawMode = false;
let isSelectMode = false;
let isPointMode = false;
let isCurveMode = false;  // New state for curve tool
let curves = [];  // Store curves: {start, end, control1, control2}
let selectedCurve = null;
let selectedControlPoint = null;
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

// Add these variables at the top with other state variables
let isEditingLength = false;
let editingLine = null;
let editLengthInput = '';
let tooltipText = '';

// Add these variables at the top
let snapPoint = null;
let snapDistance = 10;

// Add this variable at the top with other state variables
let hoverSnapPoint = null;

// Add to the top with other state variables
let curveCache = new Map(); // Cache for curve lengths

// Add at the top with other state variables
let showObjectTree = true;
let objectTreeWidth = 200;
let isResizingTree = false;
let treeMinWidth = 150;
let treeMaxWidth = 400;

// Add at the top with other state variables
let showLabels = true;

// Add at the top with other state variables
let buttonTooltip = '';

function saveState(action) {
    redoStack = [];
    undoStack.push({
        action: action,
        lines: JSON.parse(JSON.stringify(lines)),
        points: JSON.parse(JSON.stringify(points)),
        curves: JSON.parse(JSON.stringify(curves))
    });
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push({
            lines: JSON.parse(JSON.stringify(lines)),
            points: JSON.parse(JSON.stringify(points)),
            curves: JSON.parse(JSON.stringify(curves))
        });
        let prevState = undoStack.pop();
        lines = prevState.lines;
        points = prevState.points;
        curves = prevState.curves;
        redrawAll();
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push({
            lines: JSON.parse(JSON.stringify(lines)),
            points: JSON.parse(JSON.stringify(points)),
            curves: JSON.parse(JSON.stringify(curves))
        });
        let nextState = redoStack.pop();
        lines = nextState.lines;
        points = nextState.points;
        curves = nextState.curves;
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

    // Handle delete key
    if (keyCode === DELETE || keyCode === BACKSPACE) {
        if (isSelectMode) {
            if (selectedPoint) {
                points = points.filter(p => p !== selectedPoint);
                selectedPoint = null;
                saveState('delete_point');
                redrawAll();
                return false;
            } else if (selectedLine) {
                lines = lines.filter(l => l !== selectedLine);
                selectedLine = null;
                saveState('delete_line');
                redrawAll();
                return false;
            } else if (selectedCurve) {
                curves = curves.filter(c => c !== selectedCurve);
                selectedCurve = null;
                selectedControlPoint = null;
                saveState('delete_curve');
                redrawAll();
                return false;
            }
        }
    }

    if (isEditingLength) {
        if (keyCode === ENTER || keyCode === RETURN) {
            let newLength = parseFloat(editLengthInput);
            if (!isNaN(newLength) && newLength > 0) {
                updateLineLength(editingLine, newLength);
                saveState('resize');
            }
            isEditingLength = false;
            editingLine = null;
            editLengthInput = '';
            redrawAll();
        } else if (keyCode === ESCAPE) {
            isEditingLength = false;
            editingLine = null;
            editLengthInput = '';
            redrawAll();
        } else if (keyCode === BACKSPACE) {
            editLengthInput = editLengthInput.slice(0, -1);
            redrawAll();
        } else if ((keyCode >= 48 && keyCode <= 57) || keyCode === 190) {
            // Allow numbers and decimal point
            let char = String.fromCharCode(keyCode);
            if (keyCode === 190) char = '.';
            editLengthInput += char;
            redrawAll();
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

    // Load JetBrains Mono font
    textFont('JetBrains Mono');

    drawLineButton();
    drawSnapButton();
    drawSelectButton();
    drawPointButton();
    drawCurveButton();
    drawLabelsButton();
    drawZoomSlider();

    // Initialize tooltip
    updateTooltip();

    // Initial redraw to show all UI elements
    redrawAll();
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
}

function drawSnapButton() {
    fill(isSnapMode ? 150 : 200);
    stroke(0);
    rect(70, 20, 40, 40);
}

function drawSelectButton() {
    fill(isSelectMode ? 150 : 200);
    stroke(0);
    rect(120, 20, 40, 40);
}

function drawPointButton() {
    fill(isPointMode ? 150 : 200);
    stroke(0);
    rect(170, 20, 40, 40);
}

function drawCurveButton() {
    // Draw button background
    fill(isCurveMode ? 150 : 200);
    stroke(0);
    rect(220, 20, 40, 40);
}

function drawLabelsButton() {
    fill(showLabels ? 150 : 200);
    stroke(0);
    rect(270, 20, 40, 40);
}

function drawZoomSlider() {
    let sliderX = width - objectTreeWidth - 120;
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
    let sliderX = width - objectTreeWidth - 120;
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
    if (!showLabels) return;
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

    // Draw the text background
    fill(255, 255, 255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(scaledTextSize);

    let displayText = isEditingLength && line === editingLine ?
        editLengthInput + 'cm' :
        length + 'cm';

    // Make the background slightly larger when editing
    let padding = isEditingLength && line === editingLine ? 10 : 5;
    let textWidth = displayText.length * scaledTextSize * 0.6;
    rect(-textWidth / 2 - padding, -strokeOffset - scaledTextSize - padding,
        textWidth + padding * 2, scaledTextSize + padding * 2, 5);

    // Draw the text
    fill(0);
    if (isEditingLength && line === editingLine) {
        fill(0, 0, 255);
    }
    text(displayText, 0, -strokeOffset - scaledTextSize / 2);

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

        // Find if point is on any line or curve
        let isOnElement = false;

        // Check lines
        for (let l of lines) {
            let d = distToSegment(pointPx, gridToPixel(l.start), gridToPixel(l.end));
            if (d < 0.1) {
                // Draw distances to line ends
                let distToStart = calculateLength(p, l.start);
                let distToEnd = calculateLength(p, l.end);

                drawPointDistances(pointPx, distToStart, distToEnd);
                isOnElement = true;
                break;
            }
        }

        // Check curves if not already on a line
        if (!isOnElement) {
            for (let c of curves) {
                if (isPointOnCurve(p, c)) {
                    // Calculate distances along the curve
                    let distToStart = calculateCurveDistanceToPoint(c, p, true);
                    let distToEnd = calculateCurveDistanceToPoint(c, p, false);

                    drawPointDistances(pointPx, distToStart, distToEnd);
                    isOnElement = true;
                    break;
                }
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

    // Draw preview point with distances
    if (isPointMode && nearestPointOnLine) {
        let previewPx = gridToPixel(nearestPointOnLine);

        // Draw the preview point
        fill(0, 0, 255);
        stroke(0, 0, 255);
        let scaledRadius = 4 * Math.sqrt(zoomLevel);
        circle(previewPx.x, previewPx.y, scaledRadius * 2);

        // If hovering over a curve, show distances
        if (highlightedLine === null) {  // We use null highlightedLine to indicate curve
            for (let c of curves) {
                let nearestPoint = getNearestPointOnCurve({ x: mouseX, y: mouseY }, c);
                if (nearestPoint.distance < 10 * Math.sqrt(zoomLevel)) {
                    let distToStart = calculateCurveDistanceToPoint(c, nearestPointOnLine, true);
                    let distToEnd = calculateCurveDistanceToPoint(c, nearestPointOnLine, false);
                    drawPointDistances(previewPx, distToStart, distToEnd);
                    break;
                }
            }
        }
    }
}

function drawPointDistances(pointPx, distToStart, distToEnd) {
    if (!showLabels) return;
    let scaledTextSize = 10 * Math.sqrt(zoomLevel);

    // Draw background for distances
    fill(255, 255, 255, 200);
    noStroke();
    textAlign(LEFT, BOTTOM);
    textSize(scaledTextSize);
    text(distToStart + 'cm', pointPx.x + 5, pointPx.y - 5);
    text(distToEnd + 'cm', pointPx.x + 5, pointPx.y + 15);

    // Draw text
    fill(0);
    text(distToStart + 'cm', pointPx.x + 5, pointPx.y - 5);
    text(distToEnd + 'cm', pointPx.x + 5, pointPx.y + 15);
}

function isPointOnCurve(point, curve) {
    let pointPx = gridToPixel(point);
    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    // Increase sampling rate for more accurate detection
    for (let t = 0; t <= 1; t += 0.01) {  // Changed from 0.05 to 0.01
        let px = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, t);
        let py = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, t);
        if (dist(pointPx.x, pointPx.y, px, py) < 1) {  // Changed from 0.1 to 1 for better snapping
            return true;
        }
    }
    return false;
}

function calculateCurveDistanceToPoint(curve, point, fromStart) {
    let pointPx = gridToPixel(point);
    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    let totalLength = 0;
    let targetLength = 0;
    let foundPoint = false;
    let prevX = startPx.x;
    let prevY = startPx.y;

    // Increase sampling rate for more accurate distance calculation
    for (let t = 0; t <= 1; t += 0.01) {  // Changed from 0.05 to 0.01
        let px = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, t);
        let py = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, t);

        if (t > 0) {
            let segmentLength = dist(prevX, prevY, px, py);
            totalLength += segmentLength;

            if (!foundPoint && dist(pointPx.x, pointPx.y, px, py) < 1) {  // Changed from 0.1 to 1
                targetLength = totalLength;
                foundPoint = true;
            }
        }

        prevX = px;
        prevY = py;
    }

    // Convert to grid units
    let length = fromStart ? targetLength : (totalLength - targetLength);
    return (length / (gridSize * zoomLevel)).toFixed(1);
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

function findNearestSnapPoint(mousePoint) {
    if (!isSnapMode) return null;

    let minDist = snapDistance * Math.sqrt(zoomLevel);
    let nearest = null;

    // Check line endpoints
    for (let line of lines) {
        let startPx = gridToPixel(line.start);
        let endPx = gridToPixel(line.end);

        let distToStart = dist(mousePoint.x, mousePoint.y, startPx.x, startPx.y);
        let distToEnd = dist(mousePoint.x, mousePoint.y, endPx.x, endPx.y);

        if (distToStart < minDist) {
            minDist = distToStart;
            nearest = line.start;
        }
        if (distToEnd < minDist) {
            minDist = distToEnd;
            nearest = line.end;
        }
    }

    // Check curve endpoints
    for (let curve of curves) {
        let startPx = gridToPixel(curve.start);
        let endPx = gridToPixel(curve.end);

        let distToStart = dist(mousePoint.x, mousePoint.y, startPx.x, startPx.y);
        let distToEnd = dist(mousePoint.x, mousePoint.y, endPx.x, endPx.y);

        if (distToStart < minDist) {
            minDist = distToStart;
            nearest = curve.start;
        }
        if (distToEnd < minDist) {
            minDist = distToEnd;
            nearest = curve.end;
        }
    }

    // Check points
    for (let point of points) {
        let pointPx = gridToPixel(point);
        let distToPoint = dist(mousePoint.x, mousePoint.y, pointPx.x, pointPx.y);

        if (distToPoint < minDist) {
            minDist = distToPoint;
            nearest = point;
        }
    }

    return nearest;
}

function mouseMoved() {
    let mousePoint = { x: mouseX, y: mouseY };

    // Check button tooltips first
    if (mouseY >= 20 && mouseY <= 60) {
        if (mouseX >= 20 && mouseX <= 60) {
            buttonTooltip = "Line Tool (Click to draw lines)";
            redrawAll();
            return;
        } else if (mouseX >= 70 && mouseX <= 110) {
            buttonTooltip = "Snap Mode (Toggle grid and point snapping)";
            redrawAll();
            return;
        } else if (mouseX >= 120 && mouseX <= 160) {
            buttonTooltip = "Select Tool (Edit and move objects)";
            redrawAll();
            return;
        } else if (mouseX >= 170 && mouseX <= 210) {
            buttonTooltip = "Point Tool (Place points on lines or canvas)";
            redrawAll();
            return;
        } else if (mouseX >= 220 && mouseX <= 260) {
            buttonTooltip = "Curve Tool (Draw Bézier curves)";
            redrawAll();
            return;
        } else if (mouseX >= 270 && mouseX <= 310) {
            buttonTooltip = "Labels (Toggle measurements display)";
            redrawAll();
            return;
        }
    }

    // Clear tooltip if not over any button
    if (buttonTooltip) {
        buttonTooltip = '';
        redrawAll();
    }

    if (isDrawMode || isCurveMode) {
        // Clear previous states
        hoverSnapPoint = null;
        snapPoint = null;

        // Find nearest snap point
        let nearest = findNearestSnapPoint(mousePoint);

        if (!startPoint) {
            // When no start point, show hover preview
            hoverSnapPoint = nearest;
        } else {
            // When drawing, show snap preview
            snapPoint = nearest;
            tempEndPoint = snapPoint || snapToGrid(mousePoint);
        }
        redrawAll();
    } else if (isPointMode) {
        highlightedLine = null;
        nearestPointOnLine = null;
        let minDist = 10 * Math.sqrt(zoomLevel);

        // First check lines
        for (let l of lines) {
            let d = distToSegment(mousePoint, gridToPixel(l.start), gridToPixel(l.end));
            if (d < minDist) {
                highlightedLine = l;
                nearestPointOnLine = pixelToGrid(getPointOnLine(mousePoint, l));
                minDist = d;
            }
        }

        // Then check curves with increased detection range
        for (let c of curves) {
            let nearestPoint = getNearestPointOnCurve(mousePoint, c);
            if (nearestPoint.distance < minDist * 1.5) {  // Increased detection range for curves
                highlightedLine = null;  // Clear line highlight
                nearestPointOnLine = nearestPoint.point;
                minDist = nearestPoint.distance;
            }
        }

        updateTooltip();
        redrawAll();
        hoverSnapPoint = null;
    }

    // Check if mouse is over tree resize handle
    if (abs(mouseX - (width - objectTreeWidth)) < 5) {
        cursor('ew-resize');
    } else {
        cursor(ARROW);
    }
}

function mousePressed() {
    if (abs(mouseX - (width - objectTreeWidth)) < 5) {
        isResizingTree = true;
        return;
    }

    if (isOverZoomSlider(mouseX, mouseY)) {
        isZoomSliderDragging = true;
        let sliderX = width - objectTreeWidth - 120;
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
        updateTooltip();
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
        updateTooltip();
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
        updateTooltip();
        redrawAll();
        return;
    }

    if (mouseX >= 220 && mouseX <= 260 && mouseY >= 20 && mouseY <= 60) {
        isCurveMode = !isCurveMode;
        if (isCurveMode) {
            isDrawMode = false;
            isSelectMode = false;
            selectedLine = null;
            selectedPoint = null;
        }
        updateTooltip();
        redrawAll();
        return;
    }

    if (mouseX >= 270 && mouseX <= 310 && mouseY >= 20 && mouseY <= 60) {
        showLabels = !showLabels;
        redrawAll();
        return;
    }

    if (isPointMode) {
        let newPoint;
        if (nearestPointOnLine) {  // Changed condition to just check for preview point
            newPoint = nearestPointOnLine;  // Use the preview point position
        } else {
            newPoint = snapToGrid({ x: mouseX, y: mouseY });
        }
        points.push(newPoint);
        saveState('add_point');
        redrawAll();
    } else if (isDrawMode) {
        if (!startPoint) {
            let mousePoint = { x: mouseX, y: mouseY };
            startPoint = hoverSnapPoint || snapToGrid(mousePoint);
            hoverSnapPoint = null;
        } else {
            let mousePoint = { x: mouseX, y: mouseY };
            snapPoint = findNearestSnapPoint(mousePoint);
            let endPoint = snapPoint || snapToGrid(mousePoint);

            lines.push({
                start: startPoint,
                end: endPoint
            });
            saveState('add_line');
            startPoint = null;
            tempEndPoint = null;
            snapPoint = null;
            redrawAll();
        }
    } else if (isSelectMode) {
        let mousePoint = { x: mouseX, y: mouseY };

        // First check for curve control points if a curve is already selected
        if (selectedCurve) {
            let controlPoint = getNearestControlPoint(mousePoint, selectedCurve);
            if (controlPoint) {
                selectedControlPoint = controlPoint;
                isDraggingLine = false;
                redrawAll();
                return;
            }
        }

        // Then check for new curve selection
        selectedCurve = null;
        selectedControlPoint = null;
        for (let c of curves) {
            if (isNearCurve(mousePoint, c)) {
                selectedCurve = c;
                let controlPoint = getNearestControlPoint(mousePoint, c);
                if (controlPoint) {
                    selectedControlPoint = controlPoint;
                }
                selectedLine = null;
                selectedPoint = null;
                isDraggingLine = false;
                redrawAll();
                return;
            }
        }

        // Then check for points and lines as before
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
    } else if (isCurveMode) {
        if (!startPoint) {
            let mousePoint = { x: mouseX, y: mouseY };
            startPoint = hoverSnapPoint || snapToGrid(mousePoint);
            hoverSnapPoint = null;
            redrawAll();
        } else {
            let mousePoint = { x: mouseX, y: mouseY };
            let endPoint = snapPoint || snapToGrid(mousePoint);

            // Create control points at 1/3 and 2/3 distance between start and end
            let dx = endPoint.x - startPoint.x;
            let dy = endPoint.y - startPoint.y;
            let control1 = {
                x: startPoint.x + dx * 0.33,
                y: startPoint.y + dy * 0.33
            };
            let control2 = {
                x: startPoint.x + dx * 0.66,
                y: startPoint.y + dy * 0.66
            };

            let newCurve = {
                start: startPoint,
                end: endPoint,
                control1: control1,
                control2: control2
            };

            // Pre-calculate and cache the length
            calculateCurveLength(newCurve);
            curves.push(newCurve);
            saveState('add_curve');

            // Switch to select mode and select the new curve
            isCurveMode = false;
            isSelectMode = true;
            selectedCurve = newCurve;
            selectedControlPoint = null;  // Don't select any control point initially

            startPoint = null;
            tempEndPoint = null;
            snapPoint = null;
            redrawAll();
        }
    }

    // Check if clicking on a length label
    for (let l of lines) {
        if (startEditingLength(l, mouseX, mouseY)) {
            return;
        }
    }

    // Object tree click handling
    if (mouseX > width - objectTreeWidth && mouseY > 30) {
        let y = 40;
        let indent = 20;
        let itemHeight = 20;

        // Points section
        y += 20; // Skip header
        for (let i = 0; i < points.length; i++) {
            if (mouseY >= y && mouseY < y + itemHeight) {
                isSelectMode = true;
                isDrawMode = false;
                isPointMode = false;
                isCurveMode = false;
                selectedPoint = points[i];
                selectedLine = null;
                selectedCurve = null;
                selectedControlPoint = null;
                redrawAll();
                return;
            }
            y += itemHeight;
        }

        // Lines section
        y += 30; // Space for section header
        for (let i = 0; i < lines.length; i++) {
            if (mouseY >= y && mouseY < y + itemHeight) {
                isSelectMode = true;
                isDrawMode = false;
                isPointMode = false;
                isCurveMode = false;
                selectedLine = lines[i];
                selectedPoint = null;
                selectedCurve = null;
                selectedControlPoint = null;
                redrawAll();
                return;
            }
            y += itemHeight;
        }

        // Curves section
        y += 30; // Space for section header
        for (let i = 0; i < curves.length; i++) {
            if (mouseY >= y && mouseY < y + itemHeight) {
                isSelectMode = true;
                isDrawMode = false;
                isPointMode = false;
                isCurveMode = false;
                selectedCurve = curves[i];
                selectedPoint = null;
                selectedLine = null;
                selectedControlPoint = null;
                redrawAll();
                return;
            }
            y += itemHeight;
        }
    }
}

function mouseDragged() {
    if (isResizingTree) {
        objectTreeWidth = constrain(width - mouseX, treeMinWidth, treeMaxWidth);
        redrawAll();
        return;
    }

    if (isZoomSliderDragging) {
        let sliderX = width - objectTreeWidth - 120;
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
        } else if (selectedCurve && selectedControlPoint) {
            let newPos = snapToGrid({ x: mouseX, y: mouseY });
            selectedCurve[selectedControlPoint] = newPos;
            // Invalidate the cache when curve is modified
            curveCache.delete(JSON.stringify(selectedCurve));
            redrawAll();
            return;  // Add return to prevent other drag operations
        }
    }
    updateTooltip();
    redrawAll();
}

function mouseReleased() {
    isZoomSliderDragging = false;
    isResizingTree = false;

    if (isSelectMode && (selectedPoint || (selectedLine && (selectedHandle || isDraggingLine)))) {
        saveState('move');
    }

    isDraggingLine = false;
    dragStartPoint = null;
    if (selectedHandle) {
        selectedHandle = null;
        redrawAll();
    }
    if (isSelectMode && selectedCurve) {
        saveState('move_curve');
        // Only deselect control point, keep curve selected
        if (selectedControlPoint) {
            selectedControlPoint = null;
        }
    }
    updateTooltip();
}

function redrawAll() {
    background(220);
    drawCmGrid(gridSize * zoomLevel);
    drawLineButton();
    drawSnapButton();
    drawSelectButton();
    drawPointButton();
    drawCurveButton();
    drawLabelsButton();
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

    // Draw hover snap preview for both draw and curve modes
    if ((isDrawMode || isCurveMode) && hoverSnapPoint) {
        let snapPx = gridToPixel(hoverSnapPoint);
        stroke(0, 0, 255);
        strokeWeight(1);
        let size = 6 * Math.sqrt(zoomLevel);
        line(snapPx.x - size, snapPx.y - size, snapPx.x + size, snapPx.y + size);
        line(snapPx.x - size, snapPx.y + size, snapPx.x + size, snapPx.y - size);

        // Draw a circle around the snap point
        noFill();
        circle(snapPx.x, snapPx.y, size * 2);
    }

    // Draw snap preview for active drawing in both draw and curve modes
    if ((isDrawMode || isCurveMode) && snapPoint) {
        let snapPx = gridToPixel(snapPoint);
        stroke(0, 0, 255);
        strokeWeight(1);
        let size = 6 * Math.sqrt(zoomLevel);
        line(snapPx.x - size, snapPx.y - size, snapPx.x + size, snapPx.y + size);
        line(snapPx.x - size, snapPx.y + size, snapPx.x + size, snapPx.y - size);

        // Draw a circle around the snap point
        noFill();
        circle(snapPx.x, snapPx.y, size * 2);
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

    // Draw curves
    for (let c of curves) {
        let startPx = gridToPixel(c.start);
        let endPx = gridToPixel(c.end);
        let control1Px = gridToPixel(c.control1);
        let control2Px = gridToPixel(c.control2);

        if (c === selectedCurve && isSelectMode) {
            // Draw control handles first (behind the curve)
            stroke(200, 200, 200);
            strokeWeight(1 * Math.sqrt(zoomLevel));
            line(startPx.x, startPx.y, control1Px.x, control1Px.y);
            line(endPx.x, endPx.y, control2Px.x, control2Px.y);

            // Draw the curve
            stroke(0, 0, 255);
            strokeWeight(2 * Math.sqrt(zoomLevel));
            noFill();
            bezier(
                startPx.x, startPx.y,
                control1Px.x, control1Px.y,
                control2Px.x, control2Px.y,
                endPx.x, endPx.y
            );

            // Draw control points
            fill(255);
            stroke(0, 0, 255);
            strokeWeight(1 * Math.sqrt(zoomLevel));

            // Draw endpoints and control points
            circle(startPx.x, startPx.y, handleRadius * 2 * Math.sqrt(zoomLevel));
            circle(endPx.x, endPx.y, handleRadius * 2 * Math.sqrt(zoomLevel));
            circle(control1Px.x, control1Px.y, handleRadius * 2 * Math.sqrt(zoomLevel));
            circle(control2Px.x, control2Px.y, handleRadius * 2 * Math.sqrt(zoomLevel));

            // Draw the curve length
            drawCurveLength(c);
        } else {
            stroke(0);
            strokeWeight(1 * Math.sqrt(zoomLevel));
            noFill();
            bezier(
                startPx.x, startPx.y,
                control1Px.x, control1Px.y,
                control2Px.x, control2Px.y,
                endPx.x, endPx.y
            );

            // Draw the curve length
            drawCurveLength(c);
        }
    }

    // Draw curve preview
    if (isCurveMode && startPoint && tempEndPoint) {
        let startPx = gridToPixel(startPoint);
        let endPx = gridToPixel(tempEndPoint);

        // Create temporary control points
        let dx = tempEndPoint.x - startPoint.x;
        let dy = tempEndPoint.y - startPoint.y;
        let control1 = {
            x: startPoint.x + dx * 0.33,
            y: startPoint.y + dy * 0.33
        };
        let control2 = {
            x: startPoint.x + dx * 0.66,
            y: startPoint.y + dy * 0.66
        };
        let control1Px = gridToPixel(control1);
        let control2Px = gridToPixel(control2);

        stroke(100, 100, 255, 128);
        strokeWeight(1 * Math.sqrt(zoomLevel));
        noFill();
        bezier(
            startPx.x, startPx.y,
            control1Px.x, control1Px.y,
            control2Px.x, control2Px.y,
            endPx.x, endPx.y
        );
    }

    // Draw tooltip bar at the bottom
    let barHeight = 30;
    let padding = 10;

    // Draw bar background with slightly darker color
    fill(235);
    stroke(200);
    strokeWeight(1);
    rect(0, height - barHeight, width, barHeight);

    // Draw tooltip text with monospace font and gray color
    textFont('JetBrains Mono');
    fill(80);  // Darker gray for text
    noStroke();
    textAlign(LEFT, CENTER);
    textSize(13);
    text(buttonTooltip || tooltipText, padding, height - barHeight / 2);

    // Reset font for other text
    textFont('sans-serif');

    // Draw object tree last so it's on top
    drawObjectTree();
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

// Add this function to handle length editing
function startEditingLength(line, mx, my) {
    let startPx = gridToPixel(line.start);
    let endPx = gridToPixel(line.end);
    let midX = (startPx.x + endPx.x) / 2;
    let midY = (startPx.y + endPx.y) / 2;
    let length = calculateLength(line.start, line.end);
    let scaledTextSize = 12 * Math.sqrt(zoomLevel);
    let strokeOffset = (line === selectedLine && isSelectMode ? 2 : 1) * Math.sqrt(zoomLevel);

    // Check if click is near the length label
    let labelY = midY - strokeOffset - scaledTextSize / 2;
    let clickDistance = dist(mx, my, midX, labelY);

    if (clickDistance < 20 * Math.sqrt(zoomLevel)) {
        isEditingLength = true;
        editingLine = line;
        editLengthInput = length;
        return true;
    }
    return false;
}

// Add this function to update line length
function updateLineLength(line, newLength) {
    let currentLength = parseFloat(calculateLength(line.start, line.end));
    if (isNaN(newLength) || newLength <= 0) return;

    // Calculate the scale factor
    let scale = newLength / currentLength;

    // Calculate the direction vector
    let dx = line.end.x - line.start.x;
    let dy = line.end.y - line.start.y;

    // Update the end point while keeping the start point fixed
    line.end = {
        x: line.start.x + dx * scale,
        y: line.start.y + dy * scale
    };

    // Update any points attached to the line
    let attachedPoints = findPointsOnLine(line);
    updatePointsOnLine(line, attachedPoints);
}

function updateTooltip() {
    if (isEditingLength) {
        tooltipText = "Type new length and press Enter to confirm, Esc to cancel";
    } else if (isDrawMode) {
        if (!startPoint) {
            tooltipText = hoverSnapPoint ? "Click to start line from snap point" : "Click to set start point of line";
        } else {
            tooltipText = snapPoint ? "Click to end line at snap point" : "Click to set end point of line";
        }
    } else if (isPointMode) {
        if (highlightedLine) {
            tooltipText = "Click to place point on line";
        } else {
            tooltipText = "Click to place point, hover over line to snap";
        }
    } else if (isSelectMode) {
        if (selectedLine) {
            if (selectedHandle) {
                tooltipText = "Drag handle to resize line, click elsewhere to deselect";
            } else if (isDraggingLine) {
                tooltipText = "Drag to move line, click elsewhere to deselect";
            } else {
                tooltipText = "Drag line or handles to edit, click length to edit value";
            }
        } else if (selectedPoint) {
            tooltipText = "Drag to move point, click elsewhere to deselect";
        } else {
            tooltipText = "Click line or point to select";
        }
    } else if (isCurveMode) {
        if (!startPoint) {
            tooltipText = hoverSnapPoint ? "Click to start curve from snap point" : "Click to set start point of curve";
        } else {
            tooltipText = snapPoint ? "Click to end curve at snap point" : "Click to set end point of curve";
        }
    } else {
        tooltipText = "Select a tool to start drawing";
    }
}

function isNearCurve(point, curve) {
    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    // Check more points along the curve for better hit detection
    for (let t = 0; t <= 1; t += 0.05) {  // Increased sampling rate
        let px = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, t);
        let py = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, t);
        if (dist(point.x, point.y, px, py) < 10 * Math.sqrt(zoomLevel)) {  // Increased hit area
            return true;
        }
    }
    return false;
}

function getNearestControlPoint(point, curve) {
    let points = [
        { type: 'start', point: curve.start },
        { type: 'end', point: curve.end },
        { type: 'control1', point: curve.control1 },
        { type: 'control2', point: curve.control2 }
    ];

    let nearest = null;
    let minDist = Infinity;

    for (let p of points) {
        let pPx = gridToPixel(p.point);
        let d = dist(point.x, point.y, pPx.x, pPx.y);
        if (d < minDist && d < handleRadius * 2 * Math.sqrt(zoomLevel)) {  // Increased hit area for handles
            minDist = d;
            nearest = p.type;
        }
    }

    return nearest;
}

function calculateCurveLength(curve) {
    // Return cached value if exists and curve hasn't changed
    const cacheKey = JSON.stringify(curve);
    if (curveCache.has(cacheKey)) {
        return curveCache.get(cacheKey);
    }

    // Calculate length by sampling points along the curve
    let length = 0;
    let prevX, prevY;
    const samples = 50;

    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, t);
        const y = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, t);

        if (i > 0) {
            length += dist(prevX, prevY, x, y);
        }
        prevX = x;
        prevY = y;
    }

    // Convert to grid units and cache the result
    length = length / (gridSize * zoomLevel);
    curveCache.set(cacheKey, length.toFixed(1));
    return length.toFixed(1);
}

function drawCurveLength(curve) {
    if (!showLabels) return;
    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    // Find the middle point of the curve
    let midT = 0.5;
    let midX = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, midT);
    let midY = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, midT);

    let length = calculateCurveLength(curve);
    let scaledTextSize = 12 * Math.sqrt(zoomLevel);
    let strokeOffset = (curve === selectedCurve && isSelectMode ? 2 : 1) * Math.sqrt(zoomLevel);

    // Draw the text background
    fill(255, 255, 255, 200);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(scaledTextSize);

    let displayText = length + 'cm';
    let padding = 5;
    let textWidth = displayText.length * scaledTextSize * 0.6;

    push();
    translate(midX, midY);

    // Draw background
    rect(-textWidth / 2 - padding, -strokeOffset - scaledTextSize - padding,
        textWidth + padding * 2, scaledTextSize + padding * 2, 5);

    // Draw text
    fill(curve === selectedCurve ? [0, 0, 255] : [0]);
    text(displayText, 0, -strokeOffset - scaledTextSize / 2);
    pop();
}

function getNearestPointOnCurve(point, curve) {
    let startPx = gridToPixel(curve.start);
    let endPx = gridToPixel(curve.end);
    let control1Px = gridToPixel(curve.control1);
    let control2Px = gridToPixel(curve.control2);

    let minDist = Infinity;
    let nearestPoint = null;

    // Increase sampling rate for smoother detection
    for (let t = 0; t <= 1; t += 0.01) {  // Changed from 0.05 to 0.01
        let px = bezierPoint(startPx.x, control1Px.x, control2Px.x, endPx.x, t);
        let py = bezierPoint(startPx.y, control1Px.y, control2Px.y, endPx.y, t);
        let d = dist(point.x, point.y, px, py);

        if (d < minDist) {
            minDist = d;
            nearestPoint = { x: px, y: py };  // Store pixel coordinates
        }
    }

    // Convert to grid coordinates after finding the nearest point
    return {
        point: pixelToGrid(nearestPoint),
        distance: minDist
    };
}

function drawObjectTree() {
    if (!showObjectTree) return;

    // Track hover state
    let hoverY = mouseY;
    let hoverX = mouseX;
    let isHovering = mouseX > width - objectTreeWidth;

    // Draw panel background
    fill(240);
    stroke(200);
    strokeWeight(1);
    rect(width - objectTreeWidth, 0, objectTreeWidth, height);

    // Draw resize handle
    stroke(180);
    line(width - objectTreeWidth, 0, width - objectTreeWidth, height);

    // Draw header
    fill(220);
    noStroke();
    rect(width - objectTreeWidth, 0, objectTreeWidth, 30);

    // Draw header text
    fill(80);
    textAlign(LEFT, CENTER);
    textSize(14);
    text("Object Tree", width - objectTreeWidth + 10, 15);

    // Start content area
    let y = 40;
    let indent = 20;
    let itemHeight = 20;
    textSize(12);

    // Draw Points section
    fill(80);
    text("Points (" + points.length + ")", width - objectTreeWidth + 10, y);
    y += 20;
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        // Check hover state
        if (isHovering && hoverY >= y && hoverY < y + itemHeight) {
            fill(220);
            noStroke();
            rect(width - objectTreeWidth, y, objectTreeWidth, itemHeight);
        }
        fill(p === selectedPoint ? [0, 0, 255] : [80]);
        text(`Point ${i + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
            width - objectTreeWidth + indent, y + itemHeight / 2);
        y += itemHeight;
    }

    // Draw Lines section
    y += 10;
    fill(80);
    text("Lines (" + lines.length + ")", width - objectTreeWidth + 10, y);
    y += 20;
    for (let i = 0; i < lines.length; i++) {
        let l = lines[i];
        // Check hover state
        if (isHovering && hoverY >= y && hoverY < y + itemHeight) {
            fill(220);
            noStroke();
            rect(width - objectTreeWidth, y, objectTreeWidth, itemHeight);
        }
        fill(l === selectedLine ? [0, 0, 255] : [80]);
        text(`Line ${i + 1} (${calculateLength(l.start, l.end)}cm)`,
            width - objectTreeWidth + indent, y + itemHeight / 2);
        y += itemHeight;
    }

    // Draw Curves section
    y += 10;
    fill(80);
    text("Curves (" + curves.length + ")", width - objectTreeWidth + 10, y);
    y += 20;
    for (let i = 0; i < curves.length; i++) {
        let c = curves[i];
        // Check hover state
        if (isHovering && hoverY >= y && hoverY < y + itemHeight) {
            fill(220);
            noStroke();
            rect(width - objectTreeWidth, y, objectTreeWidth, itemHeight);
        }
        fill(c === selectedCurve ? [0, 0, 255] : [80]);
        text(`Curve ${i + 1} (${calculateCurveLength(c)}cm)`,
            width - objectTreeWidth + indent, y + itemHeight / 2);
        y += itemHeight;
    }
} 