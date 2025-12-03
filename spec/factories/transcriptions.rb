FactoryBot.define do
  factory :transcription do
    content { "MyText" }
    summary { "MyText" }
    speaker_labels { "" }
    duration { 1 }
    status { "MyString" }
  end
end
