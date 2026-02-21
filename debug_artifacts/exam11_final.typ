
#set document(title: "Typst Final Test")
#set page(paper: "a4", margin: (x: 1.2cm, y: 1.5cm))
#set text(font: "Noto Sans CJK KR", size: 10pt, lang: "ko")
#set par(justify: true, leading: 0.65em)
#let primary = rgb("#1a237e")
#align(center)[ #text(22pt, weight: "bold", fill: primary)[2월 정기고사(정지효)] ]
#v(10pt)
#grid(columns: (1fr, 1fr), gutter: 25pt,
  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[1.] ], [다음 수의 제곱근을 구하시오. $ 289 $], [
#v(0.5em)
① 16   ② 17   ③ 18   ④ 19   ⑤ 20]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[2.] ], [다음 중 소수로 나타낼 때, 순환하지 않는 무한소수인 것을 모두 고르면? (정답 2개)], [
#v(0.5em)
① $ - sqrt(9)  $   ② $ 0.  dot(2)   dot(3)  $   ③ $  sqrt(0. 9)  $   ④ $  sqrt( frac(16, 25) )  $   ⑤ $  frac( sqrt(2) , 2)  $]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[3.] ], [다음 실수의 대소 관계가 옳은 것은?], [
#v(0.5em)
① $ 1< sqrt(3) -1 $   ② $  sqrt(12) -1>3 $   ③ $ 3- sqrt(5) < sqrt(8) - sqrt(5)  $   ④ $  sqrt(12) -2< sqrt(27) -2 $   ⑤ $  sqrt(18) +1> sqrt(20) +1 $]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[4.] ], [다음 수의 제곱근을 구하시오. 225], [
#v(0.5em)
① 14   ② 15   ③ 16   ④ 17   ⑤ 18]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[5.] ], [$  frac(3  sqrt(2) -3  sqrt(6) ,  sqrt(2) ) =a+b  sqrt(3)  $ 일 때, $ a+b $의 값은? (단, $ a, b $는 유리수)], [
#v(0.5em)
① 4   ② 3   ③ 2   ④ 1   ⑤ 0]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[6.] ], [자연수 $ x $에 대하여 $  sqrt(x)  $ 이하의 자연수의 개수를 $ f(x) $라고 할 때, $ f(125)-f(63) $의 값은?], [
#v(0.5em)
① 3   ② 4   ③ 5   ④ 6   ⑤ 7]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[7.] ], [$  sqrt((-3) ^(2) ) -(- sqrt(7) ) ^(2) + sqrt(8 ^(2) )  $을 계산하면?], [
#v(0.5em)
① 4   ② 6   ③ 8   ④ 10   ⑤ 12]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[8.] ], [다음 조건을 만족할 때, 식을 간단히 하시오. $ (a<0) $ 
  
 $  sqrt((3 a) ^(2) ) - sqrt((-4 a) ^(2) )  $], [
#v(0.5em)
① $ -a $   ② $ -7 a $   ③ $ -5 a $   ④ $ 5 a $   ⑤ $ a $]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[9.] ], [$ a>0, b>0, a b=36 $ 일 때, $ a  sqrt( frac(3 b, a) ) +b  sqrt( frac(2 a, b) )  $의 값은?], [
#v(0.5em)
① $ 2  sqrt(3) +3  sqrt(2)  $   ② $ 3  sqrt(3) +2  sqrt(2)  $   ③ $  sqrt(3) + sqrt(2)  $   ④ $  sqrt(3) +2  sqrt(2)  $   ⑤ $ 6  sqrt(3) +6  sqrt(2)  $]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[10.] ], [$ 2  sqrt(3) - sqrt(50) + sqrt(75) -2  sqrt(2) =a  sqrt(3) +b  sqrt(2)  $ 일 때, 유리수 $ a $, $ b $에 대하여 $ a+b $의 값은?], [
#v(0.5em)
① -3   ② -2   ③ -1   ④ 0   ⑤ 1]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[11.] ], [$  frac( sqrt(3) -2  sqrt(2) ,  sqrt(3) ) =a+b  sqrt(6)  $ 일 때, $ a+b $의 값은? (단, $ a, b $는 유리수)], [
#v(0.5em)
① -1   ② $ - frac(2, 3)  $   ③ $ - frac(1, 3)  $   ④ $  frac(1, 3)  $   ⑤ 1]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[12.] ], [$ ( sqrt(16) )+ sqrt((-3) ^(2) ) -( sqrt(5) ) ^(2)  $을 간단히 하면?], [
#v(0.5em)
① -4   ② -1   ③ 0   ④ 1   ⑤ 2]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[13.] ], [$ 5- sqrt(7)  $의 정수 부분을 $ a, 3+ sqrt(2)  $의 소수 부분을 $ b $라고 할 때, $ a+b $의 값은?], [
#v(0.5em)
① $ -1- sqrt(2)  $   ② $ -1+ sqrt(2)  $   ③ $ 1- sqrt(2)  $   ④ $ 1+ sqrt(2)  $   ⑤ $ 2+ sqrt(2)  $]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[14.] ], [다음 식을 간단히 하면? 
  
 $  sqrt(24)   times   sqrt( frac(3, 8) ) + frac(1,  sqrt(2) ) ( sqrt(18) - sqrt(12) )- frac(6,  sqrt(6) )  $], [
#v(0.5em)
① $ 3- sqrt(6)  $   ② $ 6+2  sqrt(6)  $   ③ $ 3+ sqrt(6)  $   ④ $ 6-2  sqrt(6)  $   ⑤ 8]) ],  [ #stack(dir: ttb, spacing: 5pt, [ #text(weight: "bold", size: 11pt)[15.] ], [$ a>0, b>0 $ 이고 $ a b=12 $ 일 때, $ a  sqrt( frac(2 b, a) ) -b  sqrt( frac(a, 2 b) )  $의 값은?], [
#v(0.5em)
① $ -2  sqrt(6)  $   ② $ 2  sqrt(6)  $   ③ $ - sqrt(6)  $   ④ $  sqrt(6)  $   ⑤ 6]) ],
)