#!/usr/bin/env python3
"""
Performance comparison script to test the improved Sin wave predictor
"""

import torch
import sys
import os
sys.path.append('.')

from src.application.use_cases.prediction_use_case import load_trained_model, PredictionUseCase

def run_performance_test():
    """Run comprehensive performance tests"""
    
    try:
        # Load model
        model_path = 'models/checkpoints/sin_predictor.pth'
        model, config = load_trained_model(model_path)
        predictor = PredictionUseCase(model, config)

        # Test scenarios
        scenarios = [
            {'start_index': 50, 'steps': 100, 'name': 'Long-range (100 steps)'},
            {'start_index': 100, 'steps': 50, 'name': 'Medium-range (50 steps)'},
            {'start_index': 200, 'steps': 30, 'name': 'Short-range (30 steps)'},
            {'start_index': 300, 'steps': 20, 'name': 'Very short (20 steps)'},
        ]

        print("=" * 70)
        print("Sin Wave Prediction AI - Performance Analysis")
        print("=" * 70)
        
        best_metrics = None
        overall_results = []

        for i, scenario in enumerate(scenarios):
            print(f"\n{i+1}. {scenario['name']}:")
            print("-" * 50)
            
            result = predictor.predict_from_csv(
                'data/sin_wave.csv', 
                start_index=scenario['start_index'],
                prediction_steps=scenario['steps']
            )
            
            metrics = predictor.evaluate_predictions(
                result['predictions'], 
                result['actual_values']
            )
            
            overall_results.append(metrics)
            
            # Display metrics
            print(f"MSE: {metrics['mse']:.6f}")
            print(f"MAE: {metrics['mae']:.6f}")
            print(f"RMSE: {metrics['rmse']:.6f}")
            print(f"Correlation: {metrics['correlation']:.6f}")
            print(f"R-squared: {metrics['r_squared']:.6f}")
            print(f"Normalized RMSE: {metrics['normalized_rmse']:.4f}")
            print(f"Data range: {metrics['data_range']:.4f}")
            
            # Assessment
            assessment = metrics['accuracy_assessment']
            print(f"Assessment: {assessment['level']}")
            print(f"Overall Score: {assessment['overall_score']}/3")
            print(f"Acceptable: {'Yes' if assessment['acceptable'] else 'No'}")
            
            # Sample predictions
            print(f"\nSample predictions (first 5):")
            for j in range(min(5, len(result['predictions']))):
                pred = result['predictions'][j]
                actual = result['actual_values'][j] if j < len(result['actual_values']) else "N/A"
                error = abs(pred - actual) if isinstance(actual, float) else "N/A"
                print(f"  {j+1}: Pred={pred:7.4f}, Actual={actual:7.4f}, Error={error}")

        # Overall summary
        print("\n" + "=" * 70)
        print("OVERALL PERFORMANCE SUMMARY")
        print("=" * 70)
        
        avg_correlation = sum(r['correlation'] for r in overall_results) / len(overall_results)
        avg_r_squared = sum(r['r_squared'] for r in overall_results) / len(overall_results)
        avg_normalized_rmse = sum(r['normalized_rmse'] for r in overall_results) / len(overall_results)
        
        print(f"Average Correlation: {avg_correlation:.6f}")
        print(f"Average R-squared: {avg_r_squared:.6f}")
        print(f"Average Normalized RMSE: {avg_normalized_rmse:.4f}")
        
        # Goal achievement check
        print(f"\nGOAL ACHIEVEMENT:")
        print(f"Target: Correlation > 0.8, R² > 0.7, Normalized RMSE < 10%")
        print(f"Achieved: Correlation = {avg_correlation:.3f} {'✓' if avg_correlation > 0.8 else '✗'}")
        print(f"         R² = {avg_r_squared:.3f} {'✓' if avg_r_squared > 0.7 else '✗'}")
        print(f"         Normalized RMSE = {avg_normalized_rmse:.1%} {'✓' if avg_normalized_rmse < 0.1 else '✗'}")
        
        success_rate = sum([
            1 if avg_correlation > 0.8 else 0,
            1 if avg_r_squared > 0.7 else 0,
            1 if avg_normalized_rmse < 0.1 else 0
        ])
        
        print(f"\nSuccess Rate: {success_rate}/3 goals achieved")
        
        if success_rate == 3:
            print("🎉 ALL PERFORMANCE GOALS ACHIEVED! 🎉")
        elif success_rate >= 2:
            print("✅ Most performance goals achieved - Good improvement!")
        else:
            print("⚠️  Some goals still need improvement")

    except Exception as e:
        print(f"Error during performance testing: {e}")

if __name__ == "__main__":
    run_performance_test()