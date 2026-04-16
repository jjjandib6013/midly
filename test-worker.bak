import * as aiWorker from './src/ai/worker';
console.log("Worker imported successfully.");

async function test() {
    try {
        console.log("Calling a function that loads models...");
        // Since loadModels is async, we can just try invoking the phase2 directly with dummy data
        await aiWorker.processKycPhase2({
            kycId: -1,
            filePath: "nonexistent",
            idType: "Test",
            idNumberEncrypted: "Test",
            idNameEncrypted: "Test",
            birthdate: new Date()
        });
    } catch(e) {
        console.error("Test error: ", e);
    }
}
test();
