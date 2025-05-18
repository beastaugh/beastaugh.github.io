let U       = URMSim,
    S       = U.Parser.Syntax,
    URM_MAX = 1e4, // Maximum number of steps the simulator will run for
    URM_LOG = true;

let urmlog = function(message) {
    if (URM_LOG === true) {
        console.log(message);
    }
}

$(document).ready(function() {
    // Hide the notice that displays if JS is disabled
    $('.no-js-notice').hide();
    
    // Find existing URM program forms and make them visible
    let forms = $('form.urm-program-input').show();
    
    // Form submission logic
    forms.each(function(i, fm) {
        let form = $(fm),
            tarea, outf, code, regs, submitter,
            program, progState,
            showStepsRadio;
        
        // DOM nodes and their contents
        tarea = form.find(`textarea#urm-program-${i}`)
                    .first();
        outf  = form.find('.output').first();
        code  = tarea.val();
        regs  = form.find(`input#urm-registers-${i}`).first();
        exbtn = form.find(`input#urm-example-${i}`).first();
        clbtn = form.find(`input#urm-reset-${i}`).first();
        
        outf.prepend(`<p>For performance reasons, the URM simulator will halt if it exceeds ${URM_MAX} steps.</p>`);
        
        exbtn.on('click', function(event) {
            event.preventDefault();
            
            urmlog("Pasting example into program field");
            
            tarea.val(
`1:  Z(3)
2:  J(2,3,6)    Line numbers are ignored.
3:  S(1)
4:  S(3)        Post-instruction comments are fine too,
5:  J(1,1,2)    they just can't include colons.

This program adds the contents of registers 1 and 2
and stores the result in register 1.
`);
            
            regs.val("5, 7, 100");
        });
        
        clbtn.on('click', function(event) {
            event.preventDefault();
            
            urmlog("Resetting");
            
            // Clear the input fields
            tarea.val('');
            regs.val('');
            
            // Remove any previous output
            outf.empty();
            
            // Reset output field to default
            outf.append(`<h3>Output</h3>`)
                .append(`<p>Run the program to generate output.</p>`);
        });
        
        form.on('submit', function(event) {
            let stateSeq, maxReg, totalSteps, finalState, showSteps, s;
            
            // Stop the form submission from reloading the page
            event.preventDefault();
            
            // Get the original event target, i.e. the button
            submitter = event.originalEvent.submitter;
            
            // DOM nodes and their contents
            tarea = form.find(`textarea#urm-program-${i}`)
                        .first();
            outf  = form.find('.output').first();
            code  = tarea.val();
            
            // Show steps if requested
            showStepsRadio = form.find(`input[name=urm-printsteps-${i}]:checked`);
            
            showSteps = showStepsRadio.val() == 'yes';
            
            // If the 'Run program' button was clicked
            if (submitter.value == 'Run program') {
                urmlog("Parsing program");
                
                // Parse the program code and register values
                progState  = URMSim.Parser.parseRegisterInput(regs.val());
                program    = URMSim.Parser.parseInput(code);
                
                // If there is an error parsing the code,
                // display the error and abort
                if (program instanceof URMSim.Parser.Error) {
                    urmlog(program);
                    
                    alert(program.errMsg);
                    
                    return;
                }
                
                // If there is an error parsing the initial register input,
                // display the error and abort
                if (progState instanceof URMSim.Parser.Error) {
                    urmlog(progState);
                    
                    alert(progState.errMsg);
                    
                    return;
                }
                
                urmlog("Running program");
                
                // Run the program
                stateSeq   = URMSim.runProgramFromForStepped(
                                 program,
                                 progState,
                                 URM_MAX);
                totalSteps = stateSeq.length - 1;
                finalState = stateSeq[totalSteps];
                maxReg     = Math.max(
                                 program.getMaxRegisterIndex(),
                                 progState.getMaxRegisterIndex());
                
                // Remove any previous output
                outf.empty();
                
                // Insert new output
                let finalValues      = finalState.getDefinedRegisters(),
                    finalValuesTable = $('<table class="urm-final-output">'),
                    finalValuesHead  = $("<tr>"),
                    finalValuesData = $("<tr>"),
                    i, r;
                
                for (i = 0; i < finalValues.length; i++) {
                    r = finalValues[i];
                    
                    if (Number.isInteger(finalValues[i])) {
                        finalValuesHead.append(`<th>R${r}</th>`);
                        finalValuesData.append(`<td class="register final">${finalState.getRegisterValue(r)}</td>`);
                    }
                }
                
                finalValuesTable.append(finalValuesHead)
                                .append(finalValuesData);
                
                outf.append(`<h3>Program final state</h3>`);
                
                // Total steps executed
                if (totalSteps < URM_MAX) {
                    outf.append(`<p>The URM executed ${totalSteps.toString()} instructions.</p>`);
                } else {
                    outf.append(`<p><strong class="high-score-error">The URM halted after exceeding the limit of ${URM_MAX} steps.</strong></p>`);
                }
                
                if (finalValues.length > 0) {
                    outf.append("<p>The final register values were:</p>")
                        .append(finalValuesTable);
                } else {
                    outf.append("<p>No registers were set to non-zero values.</p>")
                }
                
                // Print
                if (showSteps) {
                    let stepTableWrapper =
                            $("<div>", {class: "urm-intermediate-output"}),
                        stepTable        = $("<table>"),
                        headerRow        = $('<tr><th>Step</th><th>No.</th><th>Instruction</th></tr>'),
                        numStates        = stateSeq.length,
                        currentRow, reg, j, k, updated, ctr, instr;
                    
                    stepTable.append(headerRow);
                    
                    for (k = 1; k <= maxReg; k++) {
                        headerRow.append(`<th>R${k}</th>`);
                    }
                    
                    for (j = 0; j < numStates; j++) {
                        currentRow = $("<tr></tr>");
                        
                        // Output the instruction executed
                        if (j === 0) {
                            currentRow.append('<th colspan="3" class="code">&nbsp;</td>');
                        } else {
                            ctr   = stateSeq[j-1].getInstructionCounter(),
                            instr = program.getInstruction(ctr).toString();
                            currentRow.append(
                                `<th>${j}</th><td>${ctr}</td><td class="code">${instr.slice(1)}</td>`
                            );
                        }
                        
                        // Output the register values
                        for (k = 1; k <= maxReg; k++) {
                            reg        = stateSeq[j].getRegisterValue(k);
                            cellStatus = "";
                            
                            if (j === 0) {
                                cellStatus = " initial";
                            } else if (reg !== stateSeq[j-1].getRegisterValue(k)) {
                                cellStatus = " updated";
                            } else if (j > URM_MAX) {
                                cellStatus = " overflowed";
                            } else if (j+1 === numStates) {
                                cellStatus = " final";
                            }
                            
                            currentRow.append(`<td class="register${cellStatus}">${reg}</td>`);
                        }
                        
                        stepTable.append(currentRow);
                    }
                    
                    stepTableWrapper.append(stepTable);
                    outf.append(`<h3>Program intermediate steps</h3>`);
                    outf.append(stepTableWrapper);
                }
            }
        });
    });
});
