require 'rails_helper'

RSpec.describe "Transcriptions", type: :request do
  describe "GET /index" do
    it "returns http success" do
      get "/transcriptions/index"
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET /create" do
    it "returns http success" do
      get "/transcriptions/create"
      expect(response).to have_http_status(:success)
    end
  end

  describe "GET /show" do
    it "returns http success" do
      get "/transcriptions/show"
      expect(response).to have_http_status(:success)
    end
  end

end
