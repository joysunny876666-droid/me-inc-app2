using System;
using System.Collections.Generic;
using System.IO;

public class Checker {
    public static void Main() {
        string text = File.ReadAllText("app.js");
        var stack = new Stack<char>();
        var lines = new Stack<int>();
        int line = 1;
        bool inString = false;
        bool inSingleString = false;
        bool inTemplate = false;
        bool inLineComment = false;
        bool inBlockComment = false;
        
        for (int i = 0; i < text.Length; i++) {
            char c = text[i];
            char next = (i + 1 < text.Length) ? text[i+1] : '\0';
            
            if (c == '\n') line++;
            
            if (inLineComment) { if (c == '\n') inLineComment = false; continue; }
            if (inBlockComment) { if (c == '*' && next == '/') { inBlockComment = false; i++; } continue; }
            
            if (!inString && !inSingleString && !inTemplate) {
                if (c == '/' && next == '/') { inLineComment = true; i++; continue; }
                if (c == '/' && next == '*') { inBlockComment = true; i++; continue; }
                
                if (c == '"') { inString = true; continue; }
                if ((int)c == 39) { inSingleString = true; continue; }
                if ((int)c == 96) { inTemplate = true; continue; } // 96 is backtick
                
                if (c == '{' || c == '(' || c == '[') { stack.Push(c); lines.Push(line); }
                else if (c == '}' || c == ')' || c == ']') {
                    if (stack.Count == 0) { Console.WriteLine("Unmatched " + c + " at line " + line); return; }
                    char pop = stack.Pop();
                    int popLine = lines.Pop();
                    if ((c == '}' && pop != '{') || (c == ')' && pop != '(') || (c == ']' && pop != '[')) {
                        Console.WriteLine("Mismatched " + c + " at line " + line + ", expected match for " + pop + " from line " + popLine); return;
                    }
                }
            } else {
                if (c == '\\') { i++; continue; }
                if (inString && c == '"') inString = false;
                else if (inSingleString && (int)c == 39) inSingleString = false;
                else if (inTemplate && (int)c == 96) inTemplate = false;
                
                // template literal expressions 
                if (inTemplate && c == '$' && next == '{') {
                    stack.Push('{'); lines.Push(line);
                    inTemplate = false; // We are in an expression now
                    i++;
                }
            }
        }
        if (stack.Count > 0) Console.WriteLine("Unmatched " + stack.Peek() + " from line " + lines.Peek());
        else Console.WriteLine("All balanced!");
    }
}
