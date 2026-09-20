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
        }
        if (currentHunk.Count > 0) hunks.Add(currentHunk);
        
        foreach (var hunk in hunks)
        {
            List<string> originalBlock = new List<string>();
            foreach (var line in hunk)
            {
                if (line.StartsWith(" ") || line.StartsWith("-")) 
                    originalBlock.Add(line.Substring(1));
            }
            
            bool match = false;
            for (int i = 0; i <= appLines.Count - originalBlock.Count; i++)
            {
                match = true;
                for (int j = 0; j < originalBlock.Count; j++)
                {
                    if (appLines[i + j].TrimEnd() != originalBlock[j].TrimEnd())
                    {
                        match = false;
                        break;
                    }
                }
                if (match) break;
            }
            
            if (!match)
            {
                Console.WriteLine("Failed hunk original block first line: '" + originalBlock[0] + "'");
                Console.WriteLine("Lines in original block: " + originalBlock.Count);
            }
        }
    }
}
