/** URMSim.Parser
 * 
*/
URMSim.Parser = {};

URMSim.Parser.Syntax = (function(S) {
    S.START            = "^",
    S.END              = "$",
    S.SPACES           = "\\s*",
    S.NONPROMPT        = "[^:]*",
    S.PROMPT           = ":",
    
    S.ARG              = "\\d+",
    S.ARGSTART         = "\\(",
    S.ARGEND           = "\\)",
    S.ARGSEP           = ",",
    S.ARGVALS_CAPTURE  =
        `(?<args>${S.ARG + S.SPACES}(?:${S.SPACES + S.ARGSEP + S.SPACES + S.ARG})*)`,
    
    S.COMMAND_NAMES    = {
        Z              : "ZERO",
        S              : "SUCC",
        T              : "COPY",
        J              : "JUMP"
    };
    
    S.COMM_CAPTURE     = "(?<command>[ZSTJ])"
    
    S.INSTRUCTION_PATTERN = new RegExp(
        S.START + S.NONPROMPT +
        S.PROMPT + S.SPACES +
        S.COMM_CAPTURE + S.SPACES +
        S.ARGSTART + S.SPACES +
        S.ARGVALS_CAPTURE + S.SPACES +
        S.ARGEND
    );
    
    return S;
})({});

URMSim.Parser.parseInput = function(progStr) {
    if (typeof progStr == "null" || progStr == undefined || progStr == "") {
        return new URMSim.Parser.Error("EMPTY_PROGRAM", "No program text");
    }
    
    let S        = URMSim.Parser.Syntax,
        program  = new URMSim.Program(),
        len      = progStr.length,
        i        = 0,
        match, command, args;
    
    while (i < len) {
        match = progStr.slice(i).match(S.INSTRUCTION_PATTERN);
        
        if (Array.isArray(match)) {
            cmd  = S.COMMAND_NAMES[match[1]];
            args = match[2].split(/\s*,\s*/);
            
            if (cmd === "ZERO" && args.length !== 1) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "Z instruction must have exactly 1 argument");
            } else if (cmd === "SUCC" && args.length !== 1) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "S instruction must have exactly 1 argument");
            } else if (cmd === "COPY" && args.length !== 2) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "T instruction must have exactly 2 arguments");
            } else if (cmd === "JUMP" && args.length !== 3) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "J instruction must have exactly 3 arguments");
            }
            
            if (cmd === "ZERO" && args[0] < 1) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "Z instruction argument must be a positive integer");
            } else if (cmd === "SUCC" && args[0] < 1) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "S instruction argument must be a positive integer");
            } else if (cmd === "COPY" && args[0] + args[1] < 2) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "T instruction arguments must be positive integers");
            } else if (cmd === "JUMP" && args[0] + args[1] < 2) {
                return new URMSim.Parser.Error("SYNTAX_ERROR",
                    "J instruction first and second arguments" +
                    "must be positive integers");
            }
            
            program.pushInstruction(
                new URMSim.Instruction(cmd, args)
            );
            
            i = i + match[0].length;
        } else {
            break;
        }
    }
    
    if (program.getProgramLength() < 1) {
        return new URMSim.Parser.Error("EMPTY_PROGRAM",
            "No valid instructions found");
    }
    
    return program;
};

URMSim.Parser.parseRegisterInput = function(input) {
    if (typeof input !== "string") {
        return new URMSim.Parser.Error("INVALID_REGISTER_INPUT",
            "Register input must be a string");
    }
    
    let rawvals   = input.split(/\s*,\s*/),
        registers = [],
        progState, i;
    
    for (i=0; i < rawvals.length; i++) {
        if (rawvals[i].match(/^\d+$/)) {
            registers[i] = parseInt(rawvals[i]);
        } else {
            registers[i] = null;
        }
    }
    
    progState = new URMSim.ProgramState(registers, 1);
    
    return progState;
};

URMSim.Parser.Error = function(errType, errMsg) {
    this.name    = "URMSim.Parser.Error";
    this.errType = errType;
    this.errMsg  = errMsg;
};
