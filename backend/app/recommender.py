import json
from typing import Dict, List

#Added Libraries
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import re

class BraFittingRAG:
    def __init__(self):
        self.load_knowledge_base()
        # Bug: Incorrect similarity threshold
        ## Reduced threshold for testing 0.9 ->0.7 because 0.5 give too many false positives and 0.7 is too close to false negatives
        ## Fixed by adding cosine similarity vectorisation. Alternatively 0.7 should work well, but 0.6 is a safe default.
        self.similarity_threshold = 0.6

    def load_knowledge_base(self):
        try:
            with open('app/data/bra_fitting_data.json', 'r') as f:
                self.knowledge_base = json.load(f)
        except FileNotFoundError:
            # Bug: Poor error handling
            ## Added logging
            ## File not found handled seperately
            logging.error("Knowledge base file 'app/data/bra_fitting_data.json' not found. Proceeding with an empty knowledge base.")
            self.knowledge_base = []
        

    def calculate_fit_similarity(self, query: str, context: Dict) -> float:
        # Added new similarity calculation
        # cosine similarity vectorisation trained with the measurements and then compared with query.
        # Returns the similarity score and measurements for the context of recommending sister size.
        vectorizer = TfidfVectorizer()

        query_measurements = [int(x) for x in re.findall(r'\d{2,3}', query)]
        
        # Check for at least one measurement
        if query_measurements.__len__() < 2:
            logging.error("Please include valid measurements (e.g., 34, 38) ")
            raise ValueError("Please include valid measurements (e.g., 34, 38) ")
        # Check for valid measurements
        if query_measurements[0] > query_measurements[1]:
            logging.error("Underbust measurement should be less than bust measurement")
            raise ValueError("Underbust measurement should be less than bust measurement")
        
        context_measurements = [int(x) for x in re.findall(r'\d{2,3}', context['description'])]

        # Vectorize the texts
        query_vector = vectorizer.fit_transform([query+str(query_measurements)])
        context_vector = vectorizer.transform([context['description']+str(context_measurements)])

        # Calculate cosine similarity
        similarity = cosine_similarity(query_vector, context_vector).item()
        # returning two results for similarity and measurements for sister size matching
        return {"similarity": similarity,"measurements": context_measurements}

    def identify_fit_issues(self, query: str) -> List[str]:
        # Bug: Missing comprehensive issue detection
        # fixed with added cosine similarity technique
        # cosine similarity vectorisation trained with the "common_issues" and then compared with query.
        # Returns the common issues that match the query.
        issues = []
        common_problems = {
            "band ride up ": "band_riding_up",
            "straps fall off": "straps_falling",
            "straps dig in": "straps_digging",
            "cup wrinkle": "cup_wrinkling",
            "gore float or does not lay flat": "gore_floating",
            "quadraboob or overflow": "quadraboob"
        }
        texts = list(common_problems.keys())
        vectorizer = TfidfVectorizer().fit(texts)
        query_vec = vectorizer.transform([query])
        for desc, issue in common_problems.items():
            desc_vec = vectorizer.transform([desc])
            sim = cosine_similarity(query_vec, desc_vec).item()

            if sim > 0.5:  # Choosing a threshold low due to partial matching
                issues.append(issue)
        return issues

    def get_recommendation(self, query: str) -> Dict:
        try:
            # Bug: No input validation
            # fixed with added input validation and error handling
            if not isinstance(query, str) or not query.strip():
                logging.error("Empty query")
                raise ValueError("Empty query")

            # Check for minimum length
            if len(query.strip()) < 4:
                logging.error("Query is too short. Please provide more details.")
                raise ValueError("Query is too short. Please provide more details.")
            
            # Identify fit issues
            identified_issues = self.identify_fit_issues(query)
            
            # Find relevant contexts
            relevant_fits = []
            sister_fits = []
            for context in self.knowledge_base:
                similarity = self.calculate_fit_similarity(query, context)
                if similarity['similarity'] > self.similarity_threshold:
                    relevant_fits.append({
                        'context': context,
                        'similarity': similarity['similarity'],
                    })
                # Adding measurements to the context for sister fit matching
                # Adding common issues to the context for sister fit matching
                elif any(issue in context['common_issues'] for issue in identified_issues):
                    sister_fits.append({
                        'context': context,
                        'similarity': similarity['similarity'],
                        'measurements': similarity['measurements']
                    })
            if relevant_fits:
                # Cosine similarity used for better similarity matching.
                best_match = max(relevant_fits, key=lambda x: x['similarity'])
                return {
                    "recommendation": f"{best_match['context']['recommendation']}",
                    "confidence": best_match['similarity'],
                    "reasoning": best_match['context']['reasoning'],
                    "fit_tips": best_match['context']['fit_tips'],
                    "identified_issues": identified_issues
            }

            # Handle case where no relevant fits are found.
            # If no relevant fits are found, select the best sister size match based on similarity and identified issue.
            if not relevant_fits:
                # Select the best sister size match based on similarity and identified issue
                best_match = max(sister_fits, key=lambda x: x['similarity'])
                # Recommendation message for a similar sister size
                return {
                    "recommendation": f"{best_match['context']['recommendation']} . Here is a similar sister size for {best_match['measurements'][0]} underbust and {best_match['measurements'][1]} bust.", 
                    "confidence": best_match['similarity'],
                    "reasoning": f"Unable to find exact match. But for similar measurements, {best_match['context']['reasoning']}",
                    "fit_tips": f"Please consult our measurement guide. or {best_match['context']['fit_tips']}"
                }
            

        except ValueError as ve:
            # Handle known validation errors (e.g., bad input from user)
            return {"error": f"{str(ve)}"}
        
        except FileNotFoundError as fe:
            # Handle missing knowledge base file
            return {"error": "Knowledge base file not found. Please contact support."}
        except Exception as e:
            # Log unexpected exceptions for debugging and return generic error
            logging.exception("Unexpected error ")
            return {"error": "An unexpected error occurred. Please try again or contact support."}
