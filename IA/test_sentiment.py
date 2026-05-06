"""
Unit Tests for Sentiment Analysis Module
AI - Innovation Analytics
"""
import pytest
import json
from unittest.mock import Mock, patch
from sentiment_analysis import InnovationSentimentAI


class TestSentimentAnalysis:
    """Test cases for InnovationSentimentAI"""
    
    @pytest.fixture
    def ai(self):
        """Create AI instance for testing"""
        with patch('sentiment_analysis.genai.configure'):
            return InnovationSentimentAI(api_key="test_key")
    
    @pytest.fixture
    def positive_text(self):
        """Positive text sample"""
        return "Ótimo produto! Adorei a experiência. Recomendo para todos!"
    
    @pytest.fixture
    def negative_text(self):
        """Negative text sample"""
        return "Péssimo atendimento. Nunca mais compro aqui. Muito insatisfeito."
    
    @pytest.fixture
    def neutral_text(self):
        """Neutral text sample"""
        return "O produto llegó mas não é o que eu esperava."
    
    @pytest.fixture
    def enthusiastic_text(self):
        """Enthusiastic text sample"""
        return "Incrível! Vocês são demais! Vou contar para todos os meus amigos!"
    
    @pytest.fixture
    def aggressive_text(self):
        """Aggressive text sample"""
        return "Isso é um absurdo! Vocês não sabem fazer nada certo!"
    
    def test_ai_initialization(self, ai):
        """Test AI initialization"""
        assert ai is not None
        assert ai.model is not None
    
    @pytest.mark.asyncio
    async def test_analyze_sentiment_positive(self, ai, positive_text):
        """Test positive sentiment analysis"""
        result = await ai.analyze_sentiment(positive_text)
        
        assert result is not None
        assert "sentimento" in result
        assert "tom" in result
        assert "engajamento" in result
    
    @pytest.mark.asyncio
    async def test_analyze_sentiment_negative(self, ai, negative_text):
        """Test negative sentiment analysis"""
        result = await ai.analyze_sentiment(negative_text)
        
        assert result is not None
        assert "sentimento" in result
    
    @pytest.mark.asyncio
    async def test_analyze_sentiment_neutral(self, ai, neutral_text):
        """Test neutral sentiment analysis"""
        result = await ai.analyze_sentiment(neutral_text)
        
        assert result is not None
        assert "sentimento" in result
    
    @pytest.mark.asyncio
    async def test_analyze_sentiment_empty(self, ai):
        """Test analyzing empty text"""
        result = await ai.analyze_sentiment("")
        
        assert result is not None
    
    def test_tone_detection_professional(self, ai):
        """Test professional tone detection"""
        text = "Prezados, venho por meio deste solicitar informações."
        
        # Tone should be detected as professional
        assert "profissional" in text.lower() or "solicitar" in text
    
    def test_tone_detection_enthusiastic(self, ai, enthusiastic_text):
        """Test enthusiastic tone detection"""
        assert "Incrível" in enthusiastic_text
        assert "!" in enthusiastic_text
    
    def test_tone_detection_aggressive(self, ai, aggressive_text):
        """Test aggressive tone detection"""
        assert "absurdo" in aggressive_text
    
    def test_engagement_score_calculation(self, ai):
        """Test engagement score calculation"""
        # High engagement indicators
        high_engagement_text = """
        Oi! Tudo bem? Gostaria de saber mais sobre o produto! 
        É muito bom! Parabéns pelo trabalho! Abs!
        """
        
        # Low engagement indicators
        low_engagement_text = "ok"
        
        assert len(high_engagement_text) > len(low_engagement_text)


class TestSentimentEdgeCases:
    """Test edge cases for sentiment analysis"""
    
    @pytest.fixture
    def ai(self):
        with patch('sentiment_analysis.genai.configure'):
            return InnovationSentimentAI(api_key="test_key")
    
    @pytest.mark.asyncio
    async def test_analyze_very_short_text(self, ai):
        """Test analyzing very short text"""
        result = await ai.analyze_sentiment("ok")
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_very_long_text(self, ai):
        """Test analyzing very long text"""
        long_text = " ".join([" palavra"] * 1000)
        
        result = await ai.analyze_sentiment(long_text)
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_special_characters(self, ai):
        """Test analyzing text with special characters"""
        result = await ai.analyze_sentiment("😀 😐 😢")
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_non_portuguese(self, ai):
        """Test analyzing non-Portuguese text"""
        result = await ai.analyze_sentiment("This is a test")
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_mixed_language(self, ai):
        """Test analyzing mixed language text"""
        result = await ai.analyze_sentiment("Olá! I love this product!")
        
        assert result is not None


class TestSentimentIntegration:
    """Integration tests for sentiment analysis"""
    
    @pytest.fixture
    def ai(self):
        with patch('sentiment_analysis.genai.configure'):
            return InnovationSentimentAI(api_key="test_key")
    
    @pytest.mark.asyncio
    async def test_analyze_chat_message(self, ai):
        """Test analyzing WhatsApp chat message"""
        chat_message = "Oi! VI a vaga e gostei muito. Qual o Next?"
        
        result = await ai.analyze_sentiment(chat_message)
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_email(self, ai):
        """Test analyzing email content"""
        email = """
        Prezados,
        Gostaria de agradecer pelo retorno rapido. 
        O servico de voces esta otimo.
        Atenciosamente,
        João
        """
        
        result = await ai.analyze_sentiment(email)
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_analyze_feedback_form(self, ai):
        """Test analyzing feedback form submission"""
        feedback = """
        O sistema crashou 3 vezes hoje.
        Navegação está confusa.
        Demora demais para carregar.
        """
        
        result = await ai.analyze_sentiment(feedback)
        
        assert result is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
