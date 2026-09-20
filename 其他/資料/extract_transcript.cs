using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Collections.Generic;

class Program
{
    static void Main()
    {
        string transcriptPath = @"..\..\brain\e0c23eb0-ebf9-4a25-8b12-766f659ee509\.system_generated\logs\transcript.jsonl";
        if (!File.Exists(transcriptPath))
        {
            Console.WriteLine("Transcript not found at: " + transcriptPath);
            return;
        }

        string[] lines = File.ReadAllLines(transcriptPath);
        Console.WriteLine("Transcript lines: " + lines.Length);
        
        using (StreamWriter writer = new StreamWriter("extracted_code.txt"))
        {
            foreach (var line in lines)
            {
                if (line.Contains("\"tool_calls\"") && line.Contains("Set-Content"))
                {
                    writer.WriteLine("--- TOOL CALL FOUND ---");
                    // Very simple extraction to just dump it so I can see it
                    writer.WriteLine(line);
                }
            }
        }
        Console.WriteLine("Extracted successfully.");
    }
}
