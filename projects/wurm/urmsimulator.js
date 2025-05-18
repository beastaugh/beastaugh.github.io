/**
 * URMSim is a universal register machine simulator in JavaScript.
 *
 * A universal register machine is an abstract model of computation which is
 * extensionally equivalent to the Turing machine model, but somewhat easier to
 * work with, especially for students.
 *
 * URMSim is written by Benedict Eastaugh.
 *
 * For more details, see the project website:
 *
 * https://extralogical.net/projects/wurm
 **/
URMSim = (typeof URMSim === 'undefined') ? {} : URMSim;

URMSim.CommandNames = {
    ZERO: "Z",
    SUCC: "S",
    COPY: "T",
    JUMP: "J"
};


/**
 * URMSim.Instruction
 *
 * These are the basic operations allowed by register machines.
 *
 * A register machine program consists of a sequence of instructions, each of
 * which tells the machine to execute one of the following operations with the
 * given arguments.
 *
 * ZERO(n) is a unary operation that sets the value of register n to 0.
 *
 * SUCC(n) is a unary operation that increments the value of register n by 1.
 *
 * COPY(n,m) is a binary operation that copies the value of register m to
 * register n.
 *
 * JUMP(n,m,i) is a ternary operation that, if the values of registers n and
 * m are equal, executes instruction i of the program. If there is no
 * instruction i or if i = 0, then the program halts.
 **/
URMSim.Instruction = function(instrType, args) {
    let cmds = URMSim.CommandNames,
        len  = args.length,
        arg, i;
    
    if (!["ZERO", "SUCC", "COPY", "JUMP"].includes(instrType)) {
        throw new Error(`Invalid instruction type`);
    }
    
    for (i = 0; i < len; i++) {
        arg = parseInt(args[i]);
        
        if (arg < 0 || !Number.isInteger(arg)) {
            throw new Error("Arguments must be non-negative integers");
        }
        
        this[`arg${i+1}`] = arg;
    }
    
    if ((instrType === "ZERO") && len !== 1) {
        throw new Error("ZERO instruction only accepts 1 argument");
    } else if ((instrType === "SUCC") && len !== 1) {
        throw new Error("SUCC instruction only accepts 1 argument");
    } else if (instrType === "COPY" && len !== 2) {
        throw new Error("COPY instruction only accepts 2 arguments");
    } else if (instrType === "JUMP" && len !== 3) {
        throw new Error("JUMP instruction only accepts 3 arguments");
    }
    
    this.instructionType = instrType;
    this.numArgs         = len;
};

/**
 * URMSim.Instruction.isEqual
 *
 * Checks whether two instructions are equal to one another, i.e. they have the
 * same instruction type and the same arguments.
 **/
URMSim.Instruction.prototype.isEqual = function(other) {
    return this.instructionType === other.instructionType
        && this.arg1 === other.arg1
        && this.arg2 === other.arg2
        && this.arg3 === other.arg3;
};

/**
 * URMSim.Instruction.toString
 *
 * Pretty-printing for instructions. Calling this method returns a correct,
 * runable instruction.
 **/
URMSim.Instruction.prototype.toString = function() {
    let args = [this.arg1],
        i;
    
    for (i=2; i <= this.numArgs; i++) {
        args.push(this["arg" + i.toString()]);
    }
    
    return ":" + URMSim.CommandNames[this.instructionType]
         + "(" + args.join(",") + ")";
};


/**
 * URMSim.Program
 *
 * Essentially just a wrapper round an array of instructions.
 **/
URMSim.Program = function(instructions) {
    let i, len;
    
    if (Array.isArray(instructions)) {
        this.instructions = instructions;
    } else {
        this.instructions = [];
    }
    
    this.__calculateMaxRegisterIndex();
    
    return this;
};

URMSim.Program.name = "URMSim.Program";

/**
 * URMSim.Program.isEqual
 *
 * Checks whether two programs are equal to one another.
 **/
URMSim.Program.prototype.isEqual = function(other) {
    let len  = this.getProgramLength(),
        olen = other.getProgramLength(),
        i;
    
    if (len !== olen) {
        return false;
    }
    
    for (i = 1; i <= len; i++) {
        if ( !this.getInstruction(i).isEqual(other.getInstruction(i)) ) {
            return false;
        }
    }
    
    return true;
};

URMSim.Program.prototype.pushInstruction = function(instr) {
    this.instructions.push(instr);
    
    this.__calculateMaxRegisterIndex();
    
    return this;
};

/**
 * URMSim.Program.getInstruction
 *
 * This method is just a wrapper around the instructions property, but a useful
 * one since arrays are 0-index while registers are 1-indexed, so this method
 * does the conversion for us, thereby allowing us to avoid off-by-one errors.
 **/
URMSim.Program.prototype.getInstruction = function(i) {
    let index = parseInt(i);
    
    if ( Number.isInteger(index)
      && index >= 1
      && index <= this.getProgramLength()
    ) {
        return this.instructions[index - 1];
    } else {
        throw new TypeError("Instruction indexes must be integers >= 0 and " +
                            "<= the program length");
    }
};

/**
 * URMSim.Program.getProgramLength
 *
 * A wrapper around the length of the instructions property.
 **/
URMSim.Program.prototype.getProgramLength = function() {
    return this.instructions.length;
};

/**
 * URMSim.Program.__calculateMaxRegisterIndex
 *
 * This is an internal API call, not for external use, which updates the maximum
 * register used by a given program. Typically this should only need to be
 * called once, when the object is created.
 **/
URMSim.Program.prototype.__calculateMaxRegisterIndex = function() {
    this.__maxRegisterIndex = Math.max(0,...this.instructions.map(function(instr){
        return Math.max(instr.arg1, instr.arg2 || instr.arg1);
    }));
    
    return this;
};

/**
 * URMSim.Program.getMaxRegisterIndex
 *
 * Returns the index of the maximum register used by the program. Since
 * instruction sets are fixed and finite, this can always be computed in
 * advance. It allows us to set an upper bound on any search of a ProgramState
 * object for register values.
 **/
URMSim.Program.prototype.getMaxRegisterIndex = function() {
    return this.__maxRegisterIndex;
};

/**
 * URMSim.Program.toString
 *
 * Pretty-printing for programs. This method outputs correct syntax such that
 * when parsed it produces a functionally identical program.
 **/
URMSim.Program.prototype.toString = function() {
    return this.instructions.map(function(instruction) {
        return instruction.toString();
    }).join("\n");
};


// =============================================================================


/**
 * URMSim.ProgramState
 *
 **/
URMSim.ProgramState = function(initialRegisterValues, initialInstructionNum) {
    // Firstly, set the register values from the initialRegisterValues argument.
    let i, registerValue;
    
    this.__definedRegisters = [];
    
    // The output register (register 1, by Cutland's convention) is always
    // defined and has an initial value of 0, which can of course be overwritten
    this.setRegisterValue(1, 0);
    
    if (!Array.isArray(initialRegisterValues)) {
        throw new TypeError("initialRegisterValues must be an array");
    } else {
        for (i = 0; i < initialRegisterValues.length; i++) {
            registerValue = parseInt(initialRegisterValues[i]);
            
            if (Number.isInteger(registerValue) && registerValue >= 0) {
                // Note that registers are 1-indexed while arrays like
                // initialRegisterValues are 0-indexed, so we need to increment
                // by 1 here.
                this.setRegisterValue(i+1, registerValue);
            }
        }
        
        this.__maxRegisterIndex = initialRegisterValues.length;
    }
    
    // Secondly, set the counter from the initialInstructionNum argument.
    let instructionNumber = parseInt(initialInstructionNum);
    
    if (!(Number.isInteger(instructionNumber) && instructionNumber >= 1)) {
        throw new TypeError("instructionNumber must be a positive integer");
    }
    
    this.setInstuctionCounter(instructionNumber);
    
    return this;
};

/**
 * URMSim.ProgramState.clone
 *
 * Returns a new copy of this program state.
 **/
URMSim.ProgramState.prototype.clone = function() {
    let cloneState = new URMSim.ProgramState([], this.getInstructionCounter()),
        regVals    = this.getRegisterValues(),
        i;
    
    for (i = 1; i <= this.getMaxRegisterIndex(); i++) {
        // if (Number.isInteger(regVals[i]) && regVals[i] >= 1) {
            cloneState.setRegisterValue(i, regVals[i]);
        // }
    }
    
    return cloneState;
};

/**
 * URMSim.ProgramState.getRegisterValues
 *
 * Gets the values of all registers in order as an array.
 **/
URMSim.ProgramState.prototype.getRegisterValues = function() {
    let regVals = [],
        mri     = 0,
        propertyName, register;
    
    for (propertyName in this) {
        register = parseInt(propertyName);
        
        if (Number.isInteger(register)) {
            if (mri < register) {
                mri = register;
            }
            
            regVals[register] = this[propertyName];
        }
    }
    
    return regVals;
};

/**
 * URMSim.ProgramState.getRegisterValue
 *
 * Gets the value of a given register.
 **/
URMSim.ProgramState.prototype.getRegisterValue = function(register) {
    if (!Number.isInteger(register) || register < 1) {
        throw new TypeError("register must be a positive integer");
    }
    
    if (Number.isInteger(this[register]) && this[register] >= 0) {
        return this[register];
    } else {
        return 0;
    }
};

/**
 * URMSim.ProgramState.setRegisterValue
 *
 * Sets the value of a register to a given natural number value.
 **/
URMSim.ProgramState.prototype.setRegisterValue = function(register, value) {
    register = parseInt(register);
    
    if (Number.isInteger(register) && register >= 0) {
        if (!Number.isInteger(this[register])) {
            this.__definedRegisters.push(register);
            this.__definedRegisters.sort();
        }
        
        this[register] = value;
        
        if (register > this.__maxRegisterIndex) {
            this.__maxRegisterIndex = register;
        }
    } else {
        throw new TypeError("Register and value must both be numbers");
    }
    
    return this;
};

/**
 * URMSim.ProgramState.getMaxRegisterIndex
 *
 * Returns the index of the largest register with a defined value.
 **/
URMSim.ProgramState.prototype.getMaxRegisterIndex = function() {
    return this.__maxRegisterIndex;
};

/**
 * URMSim.ProgramState.getDefinedRegisters
 *
 * Returns an array of indexes of registers that have defined values.
 **/
URMSim.ProgramState.prototype.getDefinedRegisters = function() {
    return this.__definedRegisters;
};

/**
 * URMSim.ProgramState.getInstructionCounter
 *
 * Returns the current instruction counter.
 **/
URMSim.ProgramState.prototype.getInstructionCounter = function() {
    return this.__instructionCounter;
};

/**
 * URMSim.ProgramState.setInstuctionCounter
 *
 * Sets the instruction counter to a given integer.
 **/
URMSim.ProgramState.prototype.setInstuctionCounter = function(i) {
    let counter = parseInt(i);
    
    if (Number.isInteger(counter) && counter >= 0) {
        this.__instructionCounter = counter;
    } else {
        throw new TypeError("Instruction number must be a non-negative integer");
    }
    
    return this;
};

/**
 * URMSim.ProgramState.incrementInstructionNumber
 *
 * Increments the instruction counter by 1.
 **/
URMSim.ProgramState.prototype.incrementInstructionCounter = function() {
    if (   !Number.isInteger(this.__instructionCounter)
        || this.__instructionCounter < 0) {
        this.__instructionCounter = 0;
    }
    
    this.__instructionCounter = this.__instructionCounter + 1;
    
    return this;
};


/**
 * URMSim.ProgramState.toString
 *
 * Pretty-printing for program states.
 **/
URMSim.ProgramState.prototype.toString = function() {
    let regValsStr = this.getRegisterValues().map(function(reg, i) {
            return `R${i.toString()}: ${reg.toString()}`;
        });
    
    return [
        "Counter: " + this.counter.toString(),
        "Registers: ",
        regValsStr.join(", ")
    ].join("\n");
};


/**
 * URMSim.computeNextState
 *
 * Given a program and a program state, returns the successive program state.
 **/
URMSim.computeNextState = function(program, currentState) {
    let instrNum    = currentState.getInstructionCounter(),
        instruction = program.getInstruction(instrNum),
        instrType   = instruction.instructionType,
        //
        arg1        = instruction.arg1,
        arg2        = instruction.arg2,
        arg3        = instruction.arg3,
        //
        // The state to be returned needs to be a new object
        // or bad things happen
        nextState   = currentState.clone();
    
    // For ZERO commands, increment the instruction number
    // and set the value of the designated register to 0
    if (instrType == "ZERO") {
        nextState.incrementInstructionCounter();
        nextState.setRegisterValue(arg1, 0);
    
    // For SUCC commands, increment the instruction number
    // and increment the value of the designated register by 1
    } else if (instrType == "SUCC") {
        nextState.incrementInstructionCounter();
        nextState.setRegisterValue(arg1,
            currentState.getRegisterValue(arg1) + 1);
    
    // For COPY commands, increment the instruction number
    // and set the value of the second register to the
    // value of the first
    } else if (instrType == "COPY") {
        nextState.incrementInstructionCounter();
        nextState.setRegisterValue(arg2,
            currentState.getRegisterValue(arg1));
    
    // For JUMP commands, check whether the values of the
    // first and the second registers are equal.
    //
    // If they are, set the instruction number to the
    // value of the third argument.
    } else if (instrType == "JUMP") {
        if (    currentState.getRegisterValue(arg1)
            === currentState.getRegisterValue(arg2)
        ) {
            nextState.setInstuctionCounter(arg3);
        } else {
            nextState.incrementInstructionCounter();
        }
    }
    
    return nextState;
};

/**
 * URMSim.runProgramFromForStepped
 *
 * Runs a program from a given initial state for a fixed number of steps,
 * outputting not just the final program state but each intermediate step.
 **/
URMSim.runProgramFromForStepped = function(program, programState, maxSteps) {
    if ( !( (Number.isInteger(maxSteps) && maxSteps >= 1)
         || maxSteps === Infinity
    ) ) {
        throw new Error(
            "Number of steps must be a positive integer or Infinity"
        );
    }
    
    let currentState      = programState,
        stateSequence     = [currentState],
        instructionNumber = programState.getInstructionCounter(),
        stepCounter       = 0;
    
    while ( instructionNumber >  0
         && instructionNumber <= program.getProgramLength()
         && stepCounter <= maxSteps
    ) {
        currentState = URMSim.computeNextState(program, currentState);
        stateSequence.push(currentState);
        instructionNumber = currentState.getInstructionCounter();
        stepCounter++;
    }
    
    return stateSequence;
}

/**
 * URMSim.runProgramFromFor
 *
 * Runs a program from a given initial state for a fixed number of steps.
 **/
URMSim.runProgramFromFor = function(program, programState, numSteps) {
    return URMSim.runProgramFromForStepped(program, programState, numSteps)
                 .pop();
}

/**
 * URMSim.runProgramFrom
 *
 * Given a program and a program state, runs the program until it halts (if it
 * ever does...). Here be dragons.
 **/
URMSim.runProgramFrom = function(program, programState) {
    return URMSim.runProgramFromFor(program, programState, Infinity);
};

/**
 * URMSim.runProgramFor
 *
 * Runs a program for a fixed number of steps.
 **/
URMSim.runProgramFor = function(program, numSteps) {
    let programState = new URMSim.ProgramState([], 1);
    
    return URMSim.runProgramFromFor(program, programState, numSteps);
}

/**
 * URMSim.runProgram
 *
 * Given a program, runs the program from an initial program state in which no
 * register contains a value and the counter is 1.
 **/
URMSim.runProgram = function(program) {
    let programState = new URMSim.ProgramState([], 1);
    
    return URMSim.runProgramFrom(program, programState);
};
