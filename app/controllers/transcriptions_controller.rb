class TranscriptionsController < ApplicationController
  def index
  end

  # Create a new transcription record
  def create
    transcription = Transcription.create!(transcription_params)

    render json: { id: transcription.id }, status: :created
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def show
    @transcription = Transcription.find(params[:id])
    return render json: { error: "Transcription not found" }, status: :not_found unless @transcription

    render json: {
      id: @transcription.id,
      content: @transcription.content,
      speaker_labels: @transcription.speaker_labels,
      duration: @transcription.duration,
      status: @transcription.status
    }
  end

  def process_audio
    audio_file = params[:audio]
    return render json: { error: "No audio file provided" }, status: :bad_request unless audio_file

    temp_file = Tempfile.new(['recording', '.webm'])
    temp_file.binmode
    temp_file.write(audio_file.read)
    temp_file.rewind

    service = DeepgramService.new
    result = service.transcribe_audio(temp_file, audio_file.content_type)

    transcription = Transcription.create!(
      content: result[:content],
      speaker_labels: result[:speaker_labels],
      duration: params[:duration] || 0,
      status: :processing
    )

    temp_file.close
    temp_file.unlink

    render json: { id: transcription.id }, status: :created
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity

  end

  private

  def transcription_params
    params.require(:transcription).permit(:content, :speaker_labels, :duration)
  end

end
