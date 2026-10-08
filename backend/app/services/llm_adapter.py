import os
import json
import logging
import re
from typing import Dict, List, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("insightdi.llm")


class LLMAdapter:
    """
    Unified LLM Adapter supporting Google Gemini and OpenAI.
    Provides natural-language interpretation of quantitative analytics and forecasts.
    Falls back gracefully to the Dataset-Trained Grounding Engine if external API keys
    are not configured.
    """

    @staticmethod
    async def generate_response(
        prompt: str,
        system_instruction: str,
        provider: Optional[str] = None,
    ) -> Optional[str]:
        chosen_provider = (provider or settings.ACTIVE_LLM_PROVIDER or "gemini").lower()

        if chosen_provider == "gemini" and settings.GEMINI_API_KEY:
            try:
                return await LLMAdapter._call_gemini(prompt, system_instruction)
            except Exception as e:
                logger.warning(f"Gemini API call failed, falling back to local dataset engine: {e}")

        elif chosen_provider == "openai" and settings.OPENAI_API_KEY:
            try:
                return await LLMAdapter._call_openai(prompt, system_instruction)
            except Exception as e:
                logger.warning(f"OpenAI API call failed, falling back to local dataset engine: {e}")

        # Returns None to trigger internal Dataset-Trained synthesis
        return None

    @staticmethod
    async def _call_gemini(prompt: str, system_instruction: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

    @staticmethod
    async def _call_openai(prompt: str, system_instruction: str) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 1024,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
