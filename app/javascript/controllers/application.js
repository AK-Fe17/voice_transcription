import { Application } from "@hotwired/stimulus"
// import { registerControllers } from "stimulus-vite-helpers"

const application = Application.start()

// Configure Stimulus development experience
application.debug = false
window.Stimulus   = application

// // Auto-load all controllers from the controllers directory
// import TranscriptionController from "./controllers/transcription_controller"
// application.register("transcription", TranscriptionController)

// // Import Turbo
// import "@hotwired/turbo-rails"

// console.log("Application JavaScript loaded!")

export { application }
