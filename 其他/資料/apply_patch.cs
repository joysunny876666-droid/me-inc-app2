using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

class Program
{
    static void Main()
    {
        string[] diffLines = File.ReadAllLines("diff_recovered.txt");
        List<string> appLines = File.ReadAllLines("app.js").ToList();
        
        List<string> currentHunk = new List<string>();
        List<List<string>> hunks = new List<List<string>>();
        
        foreach (string line in diffLines)
        {
            if (line.StartsWith("@@"))
            {
                if (currentHunk.Count > 0) hunks.Add(currentHunk);
                currentHunk = new List<string>();
            }
            else if (currentHunk != null && (line.StartsWith(" ") || line.StartsWith("+") || line.StartsWith("-") || line == ""))
            {
                currentHunk.Add(line == "" ? " " : line);
            }
            else if (line.StartsWith("diff ") || line.StartsWith("index ") || line.StartsWith("--- ") || line.StartsWith("+++ "))
            {
                // Ignore headers
            }
        }
        if (currentHunk.Count > 0) hunks.Add(currentHunk);
        
        hunks.Reverse();
        
        int failed = 0;
        foreach (var hunk in hunks)
        {
            List<string> originalBlock = new List<string>();
            List<string> newBlock = new List<string>();
            
            foreach (var line in hunk)
            {
                if (line.StartsWith(" ") || line.StartsWith("-")) 
                    originalBlock.Add(line.Substring(1));
                if (line.StartsWith(" ") || line.StartsWith("+"))
                    newBlock.Add(line.Substring(1));
            }
            
            int matchIndex = -1;
            for (int i = appLines.Count - originalBlock.Count; i >= 0; i--)
            {
                bool match = true;
                for (int j = 0; j < originalBlock.Count; j++)
                {
                    if (appLines[i + j].TrimEnd() != originalBlock[j].TrimEnd())
                    {
                        match = false;
                        break;
                    }
                }
                if (match)
                {
                    matchIndex = i;
                    break;
                }
            }
            
            if (matchIndex != -1)
            {
                appLines.RemoveRange(matchIndex, originalBlock.Count);
                appLines.InsertRange(matchIndex, newBlock);
            }
            else
            {
                failed++;
                Console.WriteLine("Failed to match a hunk!");
            }
        }
        
        File.WriteAllLines("app_patched.js", appLines, new System.Text.UTF8Encoding(false));
        Console.WriteLine("Failed hunks: " + failed);
    }
}
