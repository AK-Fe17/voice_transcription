import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    console.log("✅ Transcription controller connected!")
    this.mediaRecorder = null
    this.audioChunks = []
    this.startTime = null
    this.timerInterval = null
    this.setupElements()
  }
  
  disconnect() {
    // Clean up when controller disconnects
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }
  }
  
  setupElements() {
    this.startButton = document.getElementById('start-button')
    this.stopButton = document.getElementById('stop-button')
    this.recordingStatus = document.getElementById('recording-status')
    this.liveTranscription = document.getElementById('live-transcription')
    this.liveText = document.getElementById('live-text')
    this.results = document.getElementById('results')
    this.loading = document.getElementById('loading')
    this.timer = document.getElementById('timer')
    
    console.log("Start button found:", !!this.startButton)
    
    if (this.startButton) {
      this.startButton.addEventListener('click', (e) => {
        e.preventDefault()
        console.log("Start button clicked!")
        this.startRecording()
      })
    }
    
    if (this.stopButton) {
      this.stopButton.addEventListener('click', (e) => {
        e.preventDefault()
        console.log("Stop button clicked!")
        this.stopRecording()
      })
    }
    
    const copyButton = document.getElementById('copy-button')
    if (copyButton) {
      copyButton.addEventListener('click', (e) => {
        e.preventDefault()
        this.copyTranscription()
      })
    }
  }
  
  async startRecording() {
    console.log("Starting recording...")
    
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording.')
        return
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      console.log("Microphone access granted!")
      
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        alert('MediaRecorder is not supported in your browser.')
        return
      }
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      })
      
      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          console.log("Audio chunk received:", event.data.size, "bytes")
        }
      }
      
      this.mediaRecorder.onstop = () => {
        console.log("Recording stopped, processing...")
        this.processRecording()
      }
      
      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error)
        alert("Recording error: " + event.error)
      }
      
      this.mediaRecorder.start(1000) // Collect data every second
      console.log("MediaRecorder started")
      
      this.startTimer()
      this.updateUI('recording')
      this.startLiveTranscription()
      
    } catch (error) {
      console.error('Error accessing microphone:', error)
      if (error.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please allow microphone access and try again.')
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.')
      } else {
        alert('Could not access microphone: ' + error.message)
      }
    }
  }
  
  stopRecording() {
    console.log("Stopping recording...")
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
      this.mediaRecorder.stream.getTracks().forEach(track => {
        track.stop()
        console.log("Track stopped:", track.kind)
      })
      this.stopTimer()
      this.updateUI('processing')
    } else {
      console.log("MediaRecorder not recording, state:", this.mediaRecorder?.state)
    }
  }
  
  startTimer() {
    this.startTime = Date.now()
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
      const seconds = (elapsed % 60).toString().padStart(2, '0')
      if (this.timer) {
        this.timer.textContent = `${minutes}:${seconds}`
      }
    }, 1000)
  }
  
  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }
  
  async processRecording() {
    console.log("Processing recording, chunks:", this.audioChunks.length)
    
    if (this.loading) {
      this.loading.classList.remove('hidden')
    }
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
    console.log("Audio blob created:", audioBlob.size, "bytes")
    
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    
    try {
      // Get CSRF token
      const csrfToken = document.querySelector('[name="csrf-token"]')?.content
      
      console.log("Sending audio to server...")
      
      const response = await fetch('/transcriptions/process_audio', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })
      
      console.log("Server response status:", response.status)
      
      const data = await response.json()
      console.log("Server response data:", data)
      
      if (data.id) {
        console.log("Transcription ID received:", data.id)
        this.pollForResults(data.id)
      } else {
        throw new Error(data.error || 'Failed to process audio')
      }
      
    } catch (error) {
      console.error('Error processing recording:', error)
      alert('Error processing recording: ' + error.message)
      if (this.loading) {
        this.loading.classList.add('hidden')
      }
      this.updateUI('idle')
    }
  }
  
  async pollForResults(transcriptionId) {
    console.log("Polling for results, ID:", transcriptionId)
    
    const maxAttempts = 10
    let attempts = 0
    
    const poll = async () => {
      attempts++
      console.log(`Polling attempt ${attempts}/${maxAttempts}`)
      
      try {
        const response = await fetch(`/transcriptions/${transcriptionId}`)
        const data = await response.json()
        
        console.log("Poll response:", data)

        if (data.status === 'completed') {
          console.log('helloooooooooo')
          this.displayResults(data)
        } else if (data.status === 'failed') {
          if (data.content) {
            console.warn("Summary failed but transcription exists. Showing raw text.")
            this.displayResults(data)
          } else {
            throw new Error('Transcription failed or timed out')
          }
        } else if (attempts >= maxAttempts) {
          throw new Error('Transcription failed or timed out')
        } else {
          console.log("Still processing, checking again in 2 seconds...")
          setTimeout(poll, 2000)
        }

      } catch (error) {
        console.error('Error polling for results:', error)
        alert('Error retrieving transcription: ' + error.message)
        if (this.loading) {
          this.loading.classList.add('hidden')
        }
        this.updateUI('idle')
      }
    }
    
    poll()
  }
  
  displayResults(data) {
    console.log("Displaying results:", data)
    
    if (this.loading) {
      this.loading.classList.add('hidden')
    }
    
    if (this.results) {
      this.results.classList.remove('hidden')
    }
    
    const transcriptionDiv = document.getElementById('speaker-transcription')
    if (transcriptionDiv) {
      console.log("✅ transcriptionDiv found")
      console.log("--------------")
      
      let displayText = '';
      
      if (data.speaker_labels && data.speaker_labels.length > 0) {
        console.log("✅ Has speaker_labels, count:", data.speaker_labels.length)
        
        // DIRECT approach - NO mergeSpeakerSegments call!
        // const fullText = data.speaker_labels.map(segment => segment.text.trim()).join(' ');
        console.log("✅ Full text created:")
        
        displayText = data.content;
      } else {
        console.log("ℹ️ No speaker_labels, using content")
        displayText = data.content;
      }
      
      console.log("✅ Final displayText:", displayText)
      
      // Use the displayText directly
      transcriptionDiv.innerHTML = `
        <div style="margin-bottom: 12px;">
          <p style="margin-top:4px;">${this.escapeHtml(displayText)}</p>
        </div>
      `;
      
      console.log("✅ HTML updated")
    }
    
    console.log("✅ HTMLllll updated")

    const summaryText = document.getElementById('summary-text')
    if (summaryText) {
      if (data.summary && data.summary.trim() !== "" ) {
        summaryText.textContent = data.summary
      } else {
        summaryText.textContent = "Summary unavailable (showing transcription only)"
      }
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  startLiveTranscription() {
    if (this.liveTranscription) {
      this.liveTranscription.classList.remove('hidden')
    }
    if (this.liveText) {
      this.liveText.textContent = 'Listening...'
    }
  }
  
  updateUI(state) {
    console.log("Updating UI to state:", state)
    
    switch(state) {
      case 'recording':
        if (this.startButton) this.startButton.classList.add('hidden')
        if (this.stopButton) this.stopButton.classList.remove('hidden')
        if (this.recordingStatus) this.recordingStatus.classList.remove('hidden')
        break
        
      case 'processing':
        if (this.stopButton) this.stopButton.classList.add('hidden')
        if (this.recordingStatus) this.recordingStatus.classList.add('hidden')
        if (this.liveTranscription) this.liveTranscription.classList.add('hidden')
        break
        
      case 'idle':
        if (this.startButton) this.startButton.classList.remove('hidden')
        if (this.stopButton) this.stopButton.classList.add('hidden')
        if (this.recordingStatus) this.recordingStatus.classList.add('hidden')
        if (this.liveTranscription) this.liveTranscription.classList.add('hidden')
        if (this.results) this.results.classList.add('hidden')
        break
    }
  }
  
  copyTranscription() {
    const transcription = document.getElementById('speaker-transcription')?.innerText
    if (transcription) {
      navigator.clipboard.writeText(transcription).then(() => {
        const button = document.getElementById('copy-button')
        if (button) {
          const originalText = button.textContent
          button.textContent = 'Copied!'
          setTimeout(() => {
            button.textContent = originalText
          }, 2000)
        }
      }).catch(err => {
        console.error('Failed to copy:', err)
        alert('Failed to copy to clipboard')
      })
    }
  }


}