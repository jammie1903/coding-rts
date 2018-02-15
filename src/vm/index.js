const { NodeVM, VMScript } = require('vm2');

module.exports =  class VM {

    constructor(root, username) {
        this.root = root;
        this.username = username;
        this.sandBox = {};
        
        this.vm = new NodeVM({
            wrapper: "none",
            console: "inherit",
            sandbox: this.sandBox,
            require: {
                external: true,
                builtin: { "module": true },
            }
        });

        this.script = new VMScript(`return require("./${username}/__bootstrap")`);
        
    }

    run() {
        console.log(this.vm.run(this.script, this.root).constructor.name)
        // .catch(err => {
        //     if(err === "TIME_OUT") {
        //         console.log("TIME OUT!!");   
        //     } else {
        //         console.log(err);   
        //     }
        // });
    }

}